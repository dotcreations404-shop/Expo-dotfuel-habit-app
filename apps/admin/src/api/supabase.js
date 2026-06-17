
export const SUPABASE_URL = 'https://xljamnukzgystdthzgud.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamFtbnVremd5c3RkdGh6Z3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTkwODUsImV4cCI6MjA4OTQ5NTA4NX0.lpGkMe7XvOEcSSuKh229X5AbBeho0w-vpZwPdNwk1CE';
export const ADMIN_EMAIL  = 'dotcreations404@gmail.com';
export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);



window.sb = sb;
window.ADMIN_EMAIL = ADMIN_EMAIL;

