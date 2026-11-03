/** Today's date as YYYY-MM-DD in the phone's own timezone (toISOString() would give the UTC date). */
export const localToday = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
