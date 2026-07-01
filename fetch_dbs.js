const token = "eyJraWQiOiJUa0hEN1ltOUNaQ2xESHYwazEyTEFhWjk4NTdGOE16dWxYTXJBMFpqbWVrIiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJ3b3Jrc3BhY2U6Y21xZHJubnVxMTRkYjAxZHN0NDFmcDQ4aSIsImp0aSI6InkzYmg3MDkyemdwZWR0aDhsdjhycmp3YSIsImlhdCI6MTc4MjIzOTAwODA0Nn0.Xg--dy6O_NoyI8dHPbfQoaGw4FSzTjzC0NM6Js_ijz5pYpf7bLY1PIDiFGmUo_Kli9zIe94rW5Ln37aGc94Ud9H-d7mM7PtaXzJPWO4Dl8kvqoJQ9K-koUEOe7aLE1zSSyqTqwHWPUPO02rfwMKl9C54cBMsYje-x7cK5rOIeu0WwpH-X_S1A7eopeiWRTv2VMU5o27cLq8l82LBe-QGDcqF-53Ca6rvGzPFdo11x6oIVGF0r8MR_loA8G55SjFVVXALttuHtC5So0ozCTN_JJT20754D8CQyKD_xNrqWfe3KYvSsv3l84Z4ItNwYcVe5ca-4sV5OwVA2ySvboXGhQ";

async function fetchDatabases() {
  const url = 'https://api.prisma.io/v1/databases';
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log(res.status);
    console.log(await res.text());
  } catch (e) {
    console.error(e);
  }
}

fetchDatabases();
