// app/(main)/artisan-os/orders/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrdersManagement } from "./orders-management";
import * as actions from "./actions";

export const dynamic = "force-dynamic";

async function createProduct(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await actions.createProduct(user.id, formData);
}

async function updateProduct(id: string, formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await actions.updateProduct(user.id, id, formData);
}

async function deleteProduct(id: string) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await actions.deleteProduct(user.id, id);
}

async function createOrder(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await actions.createOrder(user.id, formData);
}

async function deleteOrder(id: string) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await actions.deleteOrder(user.id, id);
}

export default async function OrdersPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const { data: products } = await supabase
    .from("products")
    .select("id, product_name, unique_id, stock_count, sold_count")
    .eq("user_id", user.id)
    .order("product_name", { ascending: true });

  const { data: orders } = await supabase
    .from("orders")
    .select("id, created_at, customer_name, quantity, status, products(product_name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#F9F9F8]">
      <div className="max-w-4xl mx-auto w-full py-12 px-4">
        <h1
          className="text-2xl sm:text-3xl font-bold text-center mb-6"
          style={{ color: '#6B8E6B' }}
        >
          Orders & Stock
        </h1>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <OrdersManagement
            products={products ?? []}
            orders={orders ?? []}
            createProduct={createProduct}
            updateProduct={updateProduct}
            deleteProduct={deleteProduct}
            createOrder={createOrder}
            deleteOrder={deleteOrder}
          />
        </div>
      </div>
    </div>
  );
}