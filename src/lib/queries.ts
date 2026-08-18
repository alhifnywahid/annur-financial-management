import { queryOptions } from "@tanstack/react-query";

import { getDataBulanan, getDataUser } from "./server-functions";

/** Shared query options for the main aggregate financial data. */
export const dataBulananQueryOptions = queryOptions({
	queryKey: ["data-bulanan"],
	queryFn: () => getDataBulanan(),
});

/** Shared query options for the member list. */
export const dataUserQueryOptions = queryOptions({
	queryKey: ["data-user"],
	queryFn: () => getDataUser(),
});
