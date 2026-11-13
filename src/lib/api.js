import { supabase } from './supabase'

// --- PRODUCTOS ---
export async function apiGetProducts() {
  const { data, error } = await supabase.from('productos').select('*').order('id', { ascending: false })
  if (error) { console.error("Error cargando productos:", error); throw error }
  return data || []
}

export async function apiCreateProduct(product) {
  const { data, error } = await supabase.from('productos').insert([product]).select()
  if (error) throw error
  return data[0]
}

export async function apiUpdateProduct(id, product) {
  const { data, error } = await supabase.from('productos').update(product).eq('id', id).select()
  if (error) throw error
  return data[0]
}

export async function apiDeleteProduct(id) {
  const { error } = await supabase.from('productos').delete().eq('id', id)
  if (error) throw error
}

export async function apiUpdateStock(id, newStock) {
  const { error } = await supabase.from('productos').update({ stock: newStock }).eq('id', id)
  if (error) throw error
}

// --- VENTAS ---
export async function apiGetSales() {
  const { data, error } = await supabase.from('ventas').select('*').order('fecha', { ascending: false })
  if (error) { console.error("Error cargando ventas:", error); throw error }
  return data || []
}

export async function apiCreateSale(sale) {
  const { data, error } = await supabase.from('ventas').insert([sale]).select()
  if (error) throw error
  return data[0]
}