import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createApiClient } from "@/lib/supabase/api";

const SYSTEM_PROMPT = `You are a helpful Artisan Assistant. You can READ and WRITE the database. The user writes free-form notes about their artisan business (inventory, sales, expenses, CS).

**Read (answer questions):** If the user asks about stock levels (e.g. "How much stock for X?", "What's low?"), use check_inventory. If they ask about pending CS or customer inquiries, use check_cs_status. When the user mentions a specific product (e.g. "CS for Shadow jacket"), pass product_name so only inquiries for that product are returned. When the user asks about "unresolved", "not finished", "active", "ongoing", "remaining", or "unfinished" CS inquiries, use check_cs_status with status_filter='active'. Only use a specific status when they explicitly ask for that one. You can call multiple tools when they ask two things at once.

**Inventory & sales:**
- When the user says "register", "new item", "added product", or similar → use manage_inventory with action='register'.
- When the user says "sold", "order", "sale", "sold X of Y" → use manage_inventory with action='sell'.
- When the user says "restock", "add stock", "update stock", "received" → use manage_inventory with action='update' (increase stock).

**manage_inventory:** Use action 'register' | 'sell' | 'update'. Provide product_name and quantity. For action='sell', also pass customer_name if the user mentions a customer (otherwise we use 'Unknown Customer'), and channel (Instagram/Naver/Offline) if mentioned. Prefer unique_id when the user gives a code/SKU/ID.

**Expenses:** When they mention spending money, use log_expense (description, amount in KRW, category: material/shipping/marketing/etc).

**Customer vs Operations:** External customer issues (refunds, complaints, questions) go to **CS Master** via log_cs_inquiry. Internal tasks, production requests, partner requests, and business notes go to the **Operations Log** via log_operation (e.g. "Record a request from E-mart for more mugs", "Note: Need to check fabric tomorrow"). If the user sees a schema or cache error when saving an operation, suggest they try again in a few seconds—Supabase can take a moment to propagate schema changes.

**Customer service:** If the user mentions a customer asking a question, complaining, or requesting a refund, use log_cs_inquiry to record it. Set status to 'resolved' only if the user says they already replied (e.g. "I replied").`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "manage_inventory",
      description: "Register a new product, record a sale (deduct stock), or add stock (restock/correction).",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["register", "sell", "update"],
            description: "register = new item; sell = sales deduction; update = add stock (restock)",
          },
          product_name: { type: "string", description: "Product name (e.g. Blue Mug, Ceramic Bowl)" },
          unique_id: { type: "string", description: "Optional stable ID/SKU for the product. Preferred when user provides one." },
          quantity: { type: "integer", description: "Positive integer (for register: initial stock; for sell: units sold; for update: units to add)" },
          customer_name: { type: "string", description: "Optional. For sell: customer name from context, or omit for 'Unknown Customer'." },
          channel: { type: "string", enum: ["Instagram", "Naver", "Offline"], description: "Optional. For sell: sales channel if mentioned." },
        },
        required: ["action", "product_name", "quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_expense",
      description: "Record an expense. Use when the user mentions spending money.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "What the expense was for" },
          amount: { type: "integer", description: "Amount in KRW (e.g. 50000)" },
          category: { type: "string", enum: ["material", "shipping", "marketing", "etc"], description: "Expense category" },
        },
        required: ["description", "amount", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_cs_inquiry",
      description: "Record a customer service inquiry (question, complaint, refund request). Use when the user mentions a customer issue.",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string", description: "Customer name from context (e.g. Kim, the buyer)" },
          content: { type: "string", description: "Core message (e.g. Complaining about late delivery)" },
          product_name: { type: "string", description: "Product mentioned, if any" },
          status: { type: "string", enum: ["open", "resolved"], description: "Default 'open'. Use 'resolved' only if user says they already replied." },
          ai_reply: { type: "string", description: "Optional short suggested reply to the customer" },
        },
        required: ["customer_name", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_inventory",
      description: "Read stock levels. Use when the user asks how much stock, what's in stock, or which items are low.",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string", description: "Product name to look up (partial match). Use 'all' or leave empty to get top 5 low-stock items." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_operation",
      description: "Record an internal operations note, production request, or business reminder. Use for: partner/retailer requests (e.g. E-mart wants more mugs), internal to-dos (e.g. check fabric tomorrow), production notes. Do NOT use for customer complaints or refunds—those go to log_cs_inquiry.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The note or request text" },
          kind: { type: "string", enum: ["note", "request", "reminder"], description: "note = general note; request = external/partner request; reminder = to-do or follow-up" },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_cs_status",
      description: "Read CS inquiry counts and latest. Use when the user asks about pending/active/unresolved CS, customer inquiries, or how many tickets. If the user mentions a specific product (e.g. 'Shadow jacket'), pass product_name to filter inquiries for that product only. Use status_filter='active' for unfinished/ongoing/remaining (counts Open + In Progress + Waiting). Use a specific status only when the user asks for that status (e.g. 'Waiting' or 'In Progress').",
      parameters: {
        type: "object",
        properties: {
          status_filter: { type: "string", description: "Use 'active' for all unresolved (Open + In Progress + Waiting). Use 'open', 'in_progress', 'waiting', 'resolved', or 'closed' for a single status. Default: 'active'." },
          product_name: { type: "string", description: "Optional. When the user asks about CS for a specific product (e.g. 'Shadow jacket'), pass the product name to filter results." },
        },
        required: [],
      },
    },
  },
];

type SupabaseClient = ReturnType<typeof createApiClient>;
type ProductRow = { id: string; product_name: string; unique_id: string | null; stock_count: number; sold_count: number | null };
type ProductStockRow = { product_name: string; stock_count: number | null };
type CSInquiryRow = { status: string; customer_name: string; content: string };

async function findProduct(
  supabase: SupabaseClient,
  userId: string,
  productName: string,
  uniqueId?: string | null
): Promise<ProductRow | null> {
  if (uniqueId && String(uniqueId).trim()) {
    const { data } = await supabase
      .from("products")
      .select("id, product_name, unique_id, stock_count, sold_count")
      .eq("user_id", userId)
      .eq("unique_id", String(uniqueId).trim())
      .limit(1)
      .maybeSingle();
    if (data) return data as ProductRow;
  }
  const { data } = await supabase
    .from("products")
    .select("id, product_name, unique_id, stock_count, sold_count")
    .eq("user_id", userId)
    .ilike("product_name", productName)
    .limit(1)
    .maybeSingle();
  return data as ProductRow | null;
}

export async function GET(request: NextRequest) {
  const supabase = createApiClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("daily_logs")
    .select("id, created_at, content, ai_response")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ logs: data ?? [] });
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey?.startsWith("sk-")) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }
    const supabase = createApiClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey });
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content },
    ];

    let finalMessage = "";
    let loop = true;
    let iteration = 0;
    const maxIterations = 5;

    while (loop && iteration < maxIterations) {
      iteration++;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      });

      const choice = completion.choices[0];
      if (!choice?.message) {
        finalMessage = "I couldn't process that. Try rephrasing.";
        break;
      }

      const msg = choice.message;
      if (msg.content && typeof msg.content === "string") {
        finalMessage = msg.content.trim();
        loop = false;
        break;
      }

      if (!msg.tool_calls?.length) {
        loop = false;
        break;
      }

      messages.push(msg as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam);
      const toolResults: string[] = [];

      for (const tc of msg.tool_calls) {
        const fn = "function" in tc ? tc.function : undefined;
        const name = fn?.name;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(fn?.arguments ?? "{}");
        } catch {
          // ignore
        }
        let result = "";

        if (name === "manage_inventory") {
          const action = String(args.action ?? "").trim().toLowerCase();
          const product_name = String(args.product_name ?? "").trim();
          const unique_id = args.unique_id != null ? String(args.unique_id).trim() : null;
          const quantity = Math.max(0, Math.floor(Number(args.quantity) ?? 0));
          const customer_name = args.customer_name != null ? String(args.customer_name).trim() || "Unknown Customer" : "Unknown Customer";
          const channel = ["Instagram", "Naver", "Offline"].includes(String(args.channel)) ? args.channel : "Offline";

          if (!product_name) {
            result = "Error: product_name is required.";
          } else if (!["register", "sell", "update"].includes(action)) {
            result = "Error: action must be register, sell, or update.";
          } else if (quantity < 1) {
            result = "Error: quantity must be a positive integer.";
          } else {
            const existing = await findProduct(supabase, user.id, product_name, unique_id || undefined);

            if (action === "register") {
              if (existing) {
                result = "Error: Product already exists. Did you mean to update stock?";
              } else {
                const { data: inserted, error: insertError } = await supabase
                  .from("products")
                  .insert({
                    user_id: user.id,
                    product_name: product_name,
                    unique_id: unique_id || null,
                    stock_count: quantity,
                  })
                  .select("id, product_name, unique_id")
                  .single();
                if (insertError) {
                  console.error("manage_inventory register insert error:", insertError);
                  result = `Error: Could not register product. ${insertError.message}`;
                } else {
                  const idDisplay = inserted?.unique_id || inserted?.id;
                  result = `✅ Registered new product: ${inserted?.product_name ?? product_name} (ID: ${idDisplay}) with ${quantity} ea.`;
                }
              }
            } else if (action === "sell") {
              if (!existing) {
                result = "❌ Error: Product not found. Please register it first.";
              } else {
                const currentStock = existing.stock_count ?? 0;
                const currentSold = existing.sold_count ?? 0;
                if (currentStock < quantity) {
                  result = `❌ Error: Insufficient stock. ${existing.product_name} has ${currentStock} (need ${quantity}).`;
                } else {
                  const newStock = currentStock - quantity;
                  const newSold = currentSold + quantity;
                  const { error: updateError } = await supabase
                    .from("products")
                    .update({ stock_count: newStock, sold_count: newSold })
                    .eq("id", existing.id);
                  if (updateError) {
                    console.error("manage_inventory sell update error:", updateError);
                    result = `❌ Error updating database: ${updateError.message}`;
                  } else {
                    const { error: orderError } = await supabase.from("orders").insert({
                      user_id: user.id,
                      product_id: existing.id,
                      quantity,
                      customer_name,
                      channel,
                      total_price: 0,
                      status: "paid",
                    });
                    if (orderError) {
                      console.error("manage_inventory sell order insert error:", orderError);
                      result = `📉 Sold ${quantity}. Stock: ${currentStock} -> ${newStock}. Total Sold: ${newSold}. (Order record failed: ${orderError.message})`;
                    } else {
                      result = `📉 Sold ${quantity}. Stock: ${currentStock} -> ${newStock}. Total Sold: ${newSold}.`;
                    }
                  }
                }
              }
            } else if (action === "update") {
              if (!existing) {
                result = "❌ Error: Product not found. Please register it first.";
              } else {
                const newStock = (existing.stock_count ?? 0) + quantity;
                const { error: updateError } = await supabase
                  .from("products")
                  .update({ stock_count: newStock })
                  .eq("id", existing.id);
                if (updateError) {
                  console.error("manage_inventory update error:", updateError);
                  result = `Error: Could not update stock. ${updateError.message}`;
                } else {
                  result = `✅ Restocked ${existing.product_name} +${quantity}. New stock: ${newStock}.`;
                }
              }
            }
          }
        } else if (name === "log_expense") {
          const description = String(args.description ?? "").trim();
          const amount = Math.abs(Number(args.amount) || 0);
          const category = ["material", "shipping", "marketing", "etc"].includes(String(args.category))
            ? args.category
            : "etc";
          if (!description) {
            result = "Missing description.";
          } else {
            const { error: insertError } = await supabase.from("expenses").insert({
              user_id: user.id,
              date: new Date().toISOString().slice(0, 10),
              description,
              amount,
              category,
            });
            if (insertError) {
              console.error("log_expense insert error:", insertError);
              result = `Error: Could not record expense. ${insertError.message}`;
            } else {
              result = `Recorded expense: ${description} (${amount.toLocaleString()} KRW, ${category}).`;
            }
          }
        } else if (name === "log_cs_inquiry") {
          const customer_name = String(args.customer_name ?? "").trim() || "Unknown";
          const content = String(args.content ?? "").trim();
          const product_name = args.product_name != null ? String(args.product_name).trim() || null : null;
          const status = ["open", "resolved"].includes(String(args.status)) ? args.status : "open";
          const ai_reply = args.ai_reply != null ? String(args.ai_reply).trim() || null : null;
          if (!content) {
            result = "Error: content is required for CS inquiry.";
          } else {
            const { error: insertError } = await supabase.from("cs_inquiries").insert({
              user_id: user.id,
              customer_name,
              content,
              product_name: product_name || null,
              status,
              ai_reply,
            });
            if (insertError) {
              console.error("log_cs_inquiry insert error:", insertError);
              result = `Error: Could not create CS ticket. ${insertError.message}`;
            } else {
              result = `📝 CS Ticket Created: ${customer_name} - ${status}. Check CS Master.`;
            }
          }
        } else if (name === "log_operation") {
          const content = String(args.content ?? "").trim();
          const kindVal = ["note", "request", "reminder"].includes(String(args.kind)) ? String(args.kind) : "note";
          if (!content) {
            result = "Error: content is required for operations log.";
          } else {
            const payload = { user_id: user.id, content, kind: kindVal };
            let { error: insertError } = await supabase.from("operations_logs").insert(payload);
            if (insertError) {
              const isSchemaCacheError = /schema|cache|column|kind|relation/i.test(insertError.message);
              if (isSchemaCacheError) {
                await new Promise((r) => setTimeout(r, 2000));
                const retry = await supabase.from("operations_logs").insert(payload);
                insertError = retry.error;
              }
            }
            if (insertError) {
              console.error("log_operation insert error:", insertError);
              result = `Error: Could not record operation. ${insertError.message}${/schema|cache/i.test(insertError.message) ? " Try again in a few seconds." : ""}`;
            } else {
              result = `📄 Operation logged (${kindVal}). Check Operations Log.`;
            }
          }
        } else if (name === "check_inventory") {
          const product_name = args.product_name != null ? String(args.product_name).trim() : "";
          const isAllOrEmpty = !product_name || product_name.toLowerCase() === "all";
          if (isAllOrEmpty) {
            const { data: lowStock } = await supabase
              .from("products")
              .select("product_name, stock_count")
              .eq("user_id", user.id)
              .order("stock_count", { ascending: true })
              .limit(5);
            if (!lowStock?.length) {
              result = "📋 No products in inventory.";
            } else {
              const lines = (lowStock as ProductStockRow[]).map((p: ProductStockRow) => `${p.product_name}: ${p.stock_count ?? 0} ea.`).join(" ");
              result = `📋 Low stock (top 5): ${lines}`;
            }
          } else {
            const { data: rows } = await supabase
              .from("products")
              .select("product_name, stock_count")
              .eq("user_id", user.id)
              .ilike("product_name", `%${product_name}%`);
            if (!rows?.length) {
              result = "📋 Product not found.";
            } else {
              const lines = (rows as ProductStockRow[]).map((p: ProductStockRow) => `Found ${p.product_name}: ${p.stock_count ?? 0} ea.`).join(" ");
              result = `📋 ${lines}`;
            }
          }
        } else if (name === "check_cs_status") {
          const status_filter = args.status_filter != null ? String(args.status_filter).trim().toLowerCase() : "active";
          const productNameFilter = args.product_name != null ? String(args.product_name).trim() : "";
          const isActive = status_filter === "active" || !status_filter;
          const validSingle = ["open", "in_progress", "waiting", "resolved", "closed"];
          const singleStatus = validSingle.includes(status_filter) ? status_filter : null;

          if (isActive) {
            let base = supabase.from("cs_inquiries").select("status, customer_name, content").eq("user_id", user.id).in("status", ["open", "in_progress", "waiting"]);
            if (productNameFilter) {
              const term = productNameFilter.replace(/'/g, "''");
              base = base.or(`product_name.ilike.%${term}%,content.ilike.%${term}%`);
            }
            const { data: rows } = await base.order("created_at", { ascending: false });
            const csRows = (rows ?? []) as CSInquiryRow[];
            const open = csRows.filter((r: CSInquiryRow) => r.status === "open").length;
            const inProgress = csRows.filter((r: CSInquiryRow) => r.status === "in_progress").length;
            const waiting = csRows.filter((r: CSInquiryRow) => r.status === "waiting").length;
            const total = open + inProgress + waiting;
            const latest = csRows[0];
            const productNote = productNameFilter ? ` (product: ${productNameFilter})` : "";
            if (total === 0) {
              result = `📋 Found 0 active inquiries${productNote}: 0 Open, 0 In Progress, 0 Waiting.`;
            } else {
              const summary = `Found ${total} active inquiries${productNote}: ${open} Open, ${inProgress} In Progress, ${waiting} Waiting.`;
              result = latest ? `📋 ${summary} Latest: ${latest.customer_name} - ${latest.content}` : `📋 ${summary}`;
            }
          } else if (singleStatus) {
            let q = supabase.from("cs_inquiries").select("customer_name, content", { count: "exact" }).eq("user_id", user.id).eq("status", singleStatus);
            if (productNameFilter) {
              const term = productNameFilter.replace(/'/g, "''");
              q = q.or(`product_name.ilike.%${term}%,content.ilike.%${term}%`);
            }
            const { data: inquiries, count: total } = await q.order("created_at", { ascending: false }).limit(1);
            const latest = inquiries?.[0];
            const totalCount = total ?? 0;
            const productNote = productNameFilter ? ` for ${productNameFilter}` : "";
            if (totalCount === 0) {
              result = `📋 You have 0 ${singleStatus} inquiries${productNote}.`;
            } else if (latest) {
              result = `📋 You have ${totalCount} ${singleStatus} inquiries${productNote}. Latest: ${latest.customer_name} - ${latest.content}`;
            } else {
              result = `📋 You have ${totalCount} ${singleStatus} inquiries${productNote}.`;
            }
          } else {
            result = "📋 Use status_filter 'active' or one of: open, in_progress, waiting, resolved, closed.";
          }
        } else {
          result = "Unknown tool.";
        }

        toolResults.push(result);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam);
      }

      if (toolResults.length === 1 && !finalMessage) {
        finalMessage = toolResults[0].startsWith("✅") || toolResults[0].startsWith("📉") || toolResults[0].startsWith("📝") || toolResults[0].startsWith("📋") || toolResults[0].startsWith("📄") ? toolResults[0] : "✅ " + toolResults[0];
        loop = false;
      } else if (toolResults.length > 1) {
        finalMessage = "✅ " + toolResults.join(" ");
        loop = false;
      }
    }

    if (!finalMessage) finalMessage = "Done. No actions taken.";

    const { data: logRow, error: insertError } = await supabase
      .from("daily_logs")
      .insert({
        user_id: user.id,
        content,
        ai_response: finalMessage,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("daily_logs insert error:", insertError);
    }

    return NextResponse.json({
      message: finalMessage,
      logId: logRow?.id,
    });
  } catch (err) {
    console.error("Studio log API error:", err);
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json(
      { error: "Studio log failed.", details: message },
      { status: 500 }
    );
  }
}