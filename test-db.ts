require('dotenv').config({ path: '.env.local' });

async function test() {
  const { supabase } = require('./src/lib/supabase');
  const { data, error } = await supabase.from('bookings').insert([{
    id: 'BKG-TEST',
    day: 'Senin',
    session: 1,
    room: 'B4-11',
    namaPJ: 'Test',
    durasiPemakaian: 1,
    namaMatakuliah: 'Test',
    dosenPengampu: 'Test',
    status: 'pending'
  }]);
  console.log('Error details:', JSON.stringify(error, null, 2));
}
test();
