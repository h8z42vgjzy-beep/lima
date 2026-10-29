// Apply the last visual preference before the first paint, without storing identity.
(()=>{try{const theme=localStorage.getItem('f-theme');if(['night','pride','forest','ice'].includes(theme))document.documentElement.dataset.theme=theme;
  const language=localStorage.getItem('f-language')||(navigator.language||'de').split('-')[0];if(['de','en','ru','uk'].includes(language))document.documentElement.lang=language;
}catch{/* Storage is optional; the default theme remains usable. */}})();
