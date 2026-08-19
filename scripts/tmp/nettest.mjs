const url='https://nominatim.openstreetmap.org/search?q=Jl.%20Raya%20Kuta%2C%20Kuta%2C%20Badung%2C%20Bali&format=jsonv2&limit=2&countrycodes=id';
try{
  const r=await fetch(url,{headers:{'User-Agent':'jnt-maps-audit/1.0'}});
  console.log('status',r.status);
  const j=await r.json();
  console.log(JSON.stringify(j,null,1).slice(0,800));
}catch(e){console.log('FETCH FAIL:',e.message);}
