
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine=matchMedia('(pointer:fine)').matches;
  var prog=document.getElementById('prog');
  window.addEventListener('scroll',function(){var h=document.documentElement;prog.style.width=(h.scrollTop/(h.scrollHeight-h.clientHeight)*100)+'%';},{passive:true});

  /* reveals */
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.16});
  document.querySelectorAll('.rv').forEach(function(el){io.observe(el);});

  /* counters */
  function fmtNum(n,dec){var parts=n.toFixed(dec).split('.');parts[0]=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,',');return parts.join('.');}
  function animCount(el){var to=parseFloat(el.dataset.to),dec=parseInt(el.dataset.dec||'0'),suf=el.dataset.suffix||'';
    if(reduce){el.textContent=fmtNum(to,dec)+suf;return;}
    var s=null,dur=1300;function step(t){if(!s)s=t;var p=Math.min(1,(t-s)/dur);var e=1-Math.pow(1-p,3);el.textContent=fmtNum(to*e,dec)+suf;if(p<1)requestAnimationFrame(step);}requestAnimationFrame(step);}
  var cio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){animCount(e.target);cio.unobserve(e.target);}});},{threshold:.6});
  document.querySelectorAll('.count').forEach(function(el){cio.observe(el);});

  /* GROW ladder: draw the accent spine + pop the rung dots on scroll */
  var lio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('lit');lio.unobserve(e.target);}});},{threshold:.4});
  document.querySelectorAll('.ladder').forEach(function(el){lio.observe(el);});

  /* retention fill bars */
  var rio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.style.width=(e.target.dataset.w||'100')+'%';rio.unobserve(e.target);}});},{threshold:.5});
  document.querySelectorAll('.rbar i').forEach(function(el){rio.observe(el);});

  /* hero confidence banner — word-by-word reveal after the headline settles */
  var hbLine=document.getElementById('hbLine'), hbanner=document.getElementById('hbanner');
  if(hbLine){
    var hw=hbLine.querySelectorAll('.w');
    hw.forEach(function(w,i){w.style.transitionDelay=(i*0.06)+'s';});
    if(reduce){hbLine.classList.add('play');if(hbanner)hbanner.classList.add('done');}
    else{
      setTimeout(function(){hbLine.classList.add('play');},1900);
      setTimeout(function(){if(hbanner)hbanner.classList.add('done');},1900+hw.length*60+250);
    }
  }

  /* kinetic typewriter headline word */
  var typed=document.getElementById('typed');
  if(typed && !reduce){
    var phr=['run quietly.','feel effortless.','just work.','never break.'];
    var pi=0,ci=phr[0].length,del=false;
    function tw(){
      var w=phr[pi];
      typed.textContent=w.substring(0,ci);
      if(!del){ if(ci<w.length){ci++;setTimeout(tw,70);} else {del=true;setTimeout(tw,1500);} }
      else { if(ci>0){ci--;setTimeout(tw,34);} else {del=false;pi=(pi+1)%phr.length;setTimeout(tw,220);} }
    }
    setTimeout(tw,1600);
  }

  /* hero glow follows cursor */
  var hglow=document.getElementById('hglow');
  if(hglow && !reduce && fine){
    document.querySelector('.hero').addEventListener('mousemove',function(ev){
      var x=(ev.clientX/window.innerWidth-0.5)*50, y=(ev.clientY/window.innerHeight-0.5)*40;
      hglow.style.transform='translate('+x+'px,'+y+'px)';
    });
  }

  /* magnetic on every primary CTA */
  if(!reduce && fine){
    document.querySelectorAll('.btn-primary').forEach(function(mag){
      mag.addEventListener('mousemove',function(e){var r=mag.getBoundingClientRect();var x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;mag.style.transform='translate('+x*0.3+'px,'+y*0.4+'px)';});
      mag.addEventListener('mouseleave',function(){mag.style.transform='';});
    });
  }

  /* marquee dup for seamless loop */
  var marq=document.getElementById('marq');
  if(marq && !reduce){marq.innerHTML+=marq.innerHTML;}

  /* ===== ROLE FILTERS ===== */
  var deptWrap=document.getElementById('deptFilters');
  var locWrap=document.getElementById('locFilters');
  var roles=[].slice.call(document.querySelectorAll('#roleList .role'));
  var countEl=document.getElementById('roleCount');
  var noRoles=document.getElementById('noRoles');
  var curDept='all',curLoc='all';
  function apply(){
    var shown=0;
    roles.forEach(function(r){
      var okD=curDept==='all'||r.dataset.dept===curDept;
      var okL=curLoc==='all'||r.dataset.loc===curLoc;
      if(okD&&okL){r.classList.remove('hide');shown++;}else{r.classList.add('hide');}
    });
    noRoles.classList.toggle('show',shown===0);
    if(shown===roles.length){countEl.textContent='Showing all '+shown+' roles';}
    else{countEl.textContent=shown+' role'+(shown===1?'':'s')+' match your filters';}
  }
  function wire(wrap,set){
    if(!wrap)return;
    wrap.addEventListener('click',function(e){
      var b=e.target.closest('.chip');if(!b)return;
      wrap.querySelectorAll('.chip').forEach(function(c){c.classList.remove('on');});
      b.classList.add('on');set(b.dataset.f);apply();
    });
  }
  wire(deptWrap,function(v){curDept=v;});
  wire(locWrap,function(v){curLoc=v;});
  apply();

  /* philosophy word-by-word reveal */
  var pq=document.getElementById('philoQuote');
  if(pq){
    var tmp=document.createElement('div');tmp.innerHTML=pq.innerHTML;
    function wrapWords(node,out){
      node.childNodes.forEach(function(c){
        if(c.nodeType===3){c.textContent.split(/(\s+)/).forEach(function(w){if(w.trim()){var s=document.createElement('span');s.className='w';s.textContent=w;out.appendChild(s);}else if(w){out.appendChild(document.createTextNode(w));}});}
        else{var clone=c.cloneNode(false);if(c.classList)clone.className=c.className;wrapWords(c,clone);out.appendChild(clone);}
      });
    }
    var newRoot=document.createElement('div');wrapWords(tmp,newRoot);
    pq.innerHTML=newRoot.innerHTML;
    pq.querySelectorAll('span:not(.w)').forEach(function(sp){
      if(!sp.querySelector('.w')){var t=sp.textContent;sp.textContent='';t.split(/(\s+)/).forEach(function(w){if(w.trim()){var s=document.createElement('span');s.className='w';s.textContent=w;sp.appendChild(s);}else if(w){sp.appendChild(document.createTextNode(w));}});}
    });
    pq.querySelectorAll('.w').forEach(function(w,i){w.style.transitionDelay=(i*0.06)+'s';});
    var pio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){pq.classList.add('in');pio.disconnect();}});},{threshold:.4});
    pio.observe(pq);
  }
})();


/* ---- next block ---- */

(function(){var b=document.getElementById('navBurger'),m=document.getElementById('navMobile');if(b&&m){b.addEventListener('click',function(){var o=m.classList.toggle('open');b.setAttribute('aria-expanded',o);});}})();