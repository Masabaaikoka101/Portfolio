-- Create a table for storing analysis history
create table public.items (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users not null,
  image_url text,
  title text,
  description text,
  price numeric,
  category text,
  tags text[]
);

-- Set up Row Level Security (RLS)
alter table public.items enable row level security;

-- Policy: Users can insert their own items
create policy "Users can insert their own items"
  on public.items for insert
  with check (auth.uid() = user_id);

-- Policy: Users can view their own items
create policy "Users can view their own items"
  on public.items for select
  using (auth.uid() = user_id);

-- Policy: Users can update their own items
create policy "Users can update their own items"
  on public.items for update
  using (auth.uid() = user_id);

-- Policy: Users can delete their own items
create policy "Users can delete their own items"
  on public.items for delete
  using (auth.uid() = user_id);
