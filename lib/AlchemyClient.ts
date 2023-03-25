import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

export class AlchemyService {
  private client: AxiosInstance;

  constructor(apiUrlWithKey: string) {
    const config: AxiosRequestConfig = {
      baseURL: apiUrlWithKey,
      headers: {
        "Content-Type": "application/json",
      },
    };

    this.client = axios.create(config);
  }

  public async get<T>(url: string, options: any): Promise<T> {
    const response = await this.client.get<T>(url);
    return response.data;
  }

  public async post<T>(options: any): Promise<T> {
    const response = await this.client.request<T>(options);
    return response.data;
  }

  // Métodos para otras operaciones HTTP (PUT, DELETE, etc.)
}

export function createAlchemyClient(network?: string) {
  const apiUrlWithKey = getApiKeyByNetwork(network);
  if(!apiUrlWithKey) {
    throw new Error("apiKey undefined");
  }
  return new AlchemyService(apiUrlWithKey)
}

export function getApiKeyByNetwork(network: string | undefined) {
  switch (network) {
    case "ethereum":
      return `${process.env.NEXT_PUBLIC_ALCHEMY_ETHEREUM_API_URL}/${process.env.NEXT_PUBLIC_ALCHEMY_ETHEREUM_API_KEY}`;
    case "polygon":
      return `${process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_API_URL}/${process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_API_KEY}`;
    case "arbitrum":
      return `${process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_API_URL}/${process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_API_KEY}`;
    case "optimism":
      return `${process.env.NEXT_PUBLIC_ALCHEMY_OPTIMISM_API_URL}/${process.env.NEXT_PUBLIC_ALCHEMY_OPTIMISM_API_KEY}`;
    default:
      throw new Error("Invalid network on getApiKeyByNetwork");
  }
}
