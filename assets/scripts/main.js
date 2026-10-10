// Progressive enhancement: all content and navigation work without JavaScript.
const dialog = document.querySelector('.image-dialog');
const stage = dialog.querySelector('.image-stage');
const image = stage.querySelector('img');
let previousFocus;

document.querySelectorAll('[data-image]').forEach(button => {
  button.addEventListener('click', () => {
    previousFocus = button;
    stage.scrollTo(0, 0);
    image.src = button.dataset.image;
    image.alt = button.dataset.caption;
    dialog.querySelector('.image-original').href = button.dataset.image;
    dialog.showModal();
  });
});
dialog.querySelector('.image-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target === dialog) {
    const bounds=dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }
});
dialog.addEventListener('close', () => {
  image.removeAttribute('src');
  stage.scrollTo(0, 0);
  previousFocus?.focus({preventScroll:true});
});

const topButton = document.querySelector('.back-to-top');
let scheduled=false;
function updateScroll() {
  topButton.hidden=window.scrollY < 700;
  scheduled=false;
}
window.addEventListener('scroll', () => {
  if (!scheduled) {scheduled=true;requestAnimationFrame(updateScroll);}
}, {passive:true});
updateScroll();
topButton.addEventListener('click', () => {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({top:0, behavior:reduced?'instant':'smooth'});
});

// A brief, one-time image entrance; text stays visible at all times.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.animate([{opacity:.65,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:300,easing:'ease-out'});
        observer.unobserve(entry.target);
      }
    }
  }, {threshold:.12});
  document.querySelectorAll('.project-image, .project-figure').forEach(el=>observer.observe(el));
}
