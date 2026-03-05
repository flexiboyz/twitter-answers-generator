export interface Tweet {
  id: string;
  text: string;
  url: string;
  author: string;
  authorHandle: string;
  verified: boolean;
  followers: number;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  viewCount: number;
}

interface ApiTweet {
  id: string;
  text: string;
  url: string;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  viewCount: number;
  author: {
    name: string;
    userName: string;
    isBlueVerified: boolean;
    followers: number;
  };
}

interface ApiSearchResponse {
  tweets: ApiTweet[];
  has_next_page: boolean;
  next_cursor: string;
}

interface ApiUserResponse {
  data: {
    tweets: ApiTweet[];
  };
}

function mapTweet(t: ApiTweet): Tweet {
  return {
    id: t.id,
    text: t.text,
    url: t.url,
    author: t.author?.name ?? "unknown",
    authorHandle: t.author?.userName ?? "unknown",
    verified: t.author?.isBlueVerified ?? false,
    followers: t.author?.followers ?? 0,
    createdAt: t.createdAt,
    likeCount: t.likeCount ?? 0,
    retweetCount: t.retweetCount ?? 0,
    replyCount: t.replyCount ?? 0,
    viewCount: t.viewCount ?? 0,
  };
}

export async function searchTweets(
  apiKey: string,
  query: string,
): Promise<Tweet[]> {
  const url = new URL(
    "https://api.twitterapi.io/twitter/tweet/advanced_search",
  );
  url.searchParams.set("query", query);
  url.searchParams.set("queryType", "Latest");

  const res = await fetch(url.toString(), {
    headers: {"X-API-Key": apiKey},
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }

  const data: ApiSearchResponse = await res.json();

  return (data.tweets ?? []).map(mapTweet);
}

export async function getUserTweets(
  apiKey: string,
  userName: string,
): Promise<Tweet[]> {
  const url = new URL("https://api.twitterapi.io/twitter/user/last_tweets");
  url.searchParams.set("userName", userName);

  const res = await fetch(url.toString(), {
    headers: {"X-API-Key": apiKey},
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }

  const data: ApiUserResponse = await res.json();

  return (data.data?.tweets ?? []).map(mapTweet);
}
