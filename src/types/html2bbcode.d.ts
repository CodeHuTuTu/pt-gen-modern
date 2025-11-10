declare module 'html2bbcode' {
  interface HTML2BBCode {
    (html: string): string;
  }

  const html2bbcode: HTML2BBCode;
  export default html2bbcode;
}
