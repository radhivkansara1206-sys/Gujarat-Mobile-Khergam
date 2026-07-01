const url = 'https://api.prisma.io/v1/databases/db_cmqdrroid0j460gdvtw75fyfs/backups';

async function tryFetch() {
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': 'Bearer sk_4vsII4Fr4Ync6z4DziTaZ'
      }
    });
    console.log(res.status);
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error(e.message);
  }
}
tryFetch();
