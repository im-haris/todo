// Shared chrome for subpages: sticky nav, mobile burger, scroll reveal
(function(){
  var nav=document.getElementById('nav');
  if(nav){
    var onScroll=function(){ nav.classList.toggle('scrolled', scrollY>10); };
    onScroll(); addEventListener('scroll',onScroll,{passive:true});
  }
  var b=document.getElementById('burger'), l=document.getElementById('navlinks');
  if(b&&l) b.addEventListener('click',function(){ l.classList.toggle('open'); });

  var els=document.querySelectorAll('.reveal');
  var showAll=function(){ for(var i=0;i<els.length;i++){ els[i].classList.add('in'); } };
  if(!('IntersectionObserver' in window)){ showAll(); return; }
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  },{rootMargin:'0px 0px -8% 0px'});
  for(var i=0;i<els.length;i++){ io.observe(els[i]); }
  // Safety net: never leave content stuck at opacity 0 if the observer does not
  // fire (zero-height viewport, embedded preview, print, odd mobile browsers).
  addEventListener('load', function(){ setTimeout(showAll, 600); });
  setTimeout(showAll, 2500);
})();
