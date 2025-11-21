() => {
  window.ID = {};
  ID.getToken = () =>
    document.cookie.match(/;?t=(?<token>[^;]+);?/)?.groups.token();
};
