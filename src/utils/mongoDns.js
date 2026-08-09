import dns from "node:dns";

const MONGO_DNS_SERVERS = ["1.1.1.1", "8.8.8.8"];

export const configureMongoDns = (dnsResolver = dns) => {
  dnsResolver.setServers(MONGO_DNS_SERVERS);
};
