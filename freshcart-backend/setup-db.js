const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Add it to your .env file (never commit real credentials).');
  process.exit(1);
}

const client = new Client({
  connectionString,
});

async function run() {
  try {
    console.log('Connecting to Supabase...');
    await client.connect();

    console.log('Creating products table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL NOT NULL,
        image_url TEXT,
        category TEXT,
        in_stock BOOLEAN DEFAULT true,
        stock_quantity INTEGER DEFAULT 10,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating product_variants table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        price_adjustment DECIMAL DEFAULT 0,
        stock_quantity INTEGER DEFAULT 0
      );
    `);

    console.log('Creating reviews table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating profiles table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        full_name TEXT,
        phone_number TEXT,
        address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating orders table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        payment_status TEXT NOT NULL DEFAULT 'pending',
        payment_intent_id TEXT,
        total_amount DECIMAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating order_items table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL,
        price_at_time DECIMAL NOT NULL
      );
    `);

    console.log('Inserting sample products...');
    await client.query(`
      INSERT INTO public.products (name, description, price, category, image_url)
      VALUES 
        ('Organic Bananas', 'Fresh organic bananas from Ecuador', 2.99, 'Fruits', 'https://images.unsplash.com/photo-1571501679680-de32f1e7aad4?w=500&q=80'),
        ('Avocado', 'Ripe Hass avocados perfect for guacamole', 1.50, 'Vegetables', 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=500&q=80'),
        ('Whole Milk', '1 Gallon of whole milk', 4.99, 'Dairy', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&q=80'),
        ('Whole Wheat Bread', 'Freshly baked whole wheat sandwich bread', 3.49, 'Bakery', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80')
      ON CONFLICT DO NOTHING;
    `);

    console.log('Database setup complete!');
  } catch (err) {
    console.error('Error setting up database:', err);
  } finally {
    await client.end();
  }
}

run();
