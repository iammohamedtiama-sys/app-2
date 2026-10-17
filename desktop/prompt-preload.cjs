const {ipcRenderer}=require('electron');
window.addEventListener('DOMContentLoaded',()=>{
  const field=document.querySelector('#value');field.focus();field.select();
  document.querySelector('form').addEventListener('submit',event=>{event.preventDefault();ipcRenderer.send('yam:prompt-result',field.value);});
  document.querySelector('#cancel').addEventListener('click',()=>ipcRenderer.send('yam:prompt-result',null));
  window.addEventListener('keydown',event=>{if(event.key==='Escape')ipcRenderer.send('yam:prompt-result',null);});
});
