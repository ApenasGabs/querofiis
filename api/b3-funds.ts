interface VercelRequest {
  method?: string;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

interface B3FundItem {
  id: number;
  typeName: string | null;
  acronym: string;
  fundName: string;
  tradingName: string;
}

interface B3ListResponse {
  page: {
    pageNumber: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
  results: B3FundItem[];
}

const B3_LIST_URL =
  "https://sistemaswebb3-listados.b3.com.br/fundsListedProxy/Search/GetListFunds/eyJsYW5ndWFnZSI6InB0LWJyIiwidHlwZUZ1bmQiOiJGSUFHUk8iLCJwYWdlTnVtYmVyIjoxLCJwYWdlU2l6ZSI6MTIwLCJrZXl3b3JkIjoiIn0=";

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method && req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const response = await fetch(B3_LIST_URL, {
      headers: REQUEST_HEADERS,
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[b3-funds] Unexpected status", response.status);
      res.status(502).json({ error: "Invalid response from B3" });
      return;
    }

    const data: Partial<B3ListResponse> = await response.json();
    if (!data.results || !Array.isArray(data.results)) {
      res.status(502).json({ error: "Malformed B3 payload" });
      return;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("[b3-funds] Failed to fetch list", error);
    res.status(500).json({ error: "Failed to fetch funds list" });
  }
}
