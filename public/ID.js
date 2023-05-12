(() => {
  window.ID = {};
  ID.getToken = () => {
    let token = '';
    document.cookie.split('; ').forEach(cookie => {
      let match = cookie.match(/^t=(.+)$/);
      if (match && match[1]) {
        token = match[1];
      }
    });
    return token;
  }
})();