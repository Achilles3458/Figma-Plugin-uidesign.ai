export type StatusNetworkError = {
	type: "NETWORK_ERROR"
	code: -1
}
export type StatusOK = {
	type: "OK"
	code: 200
}
export type StatusCreated = {
	type: "CREATED"
	code: 201
}
export type StatusBadRequest = {
	type: "BAD_REQUEST"
	code: 400
}
export type StatusForbidden = {
	type: "FORBIDDEN"
	code: 403
}
export type StatusUnprocessableEntity = {
	type: "UNPROCESSABLE_ENTITY"
	code: 422
}
export type StatusResponseServerError = {
	type: "SERVER_ERROR"
	code: 503
}
export type StatusInternalError = {
	type: "INTERNAL_ERROR"
	code: 1_000
}

export const statusNetworkError: StatusNetworkError = {
	type: "NETWORK_ERROR",
	code: -1,
}
export const statusOK: StatusOK = {
	type: "OK",
	code: 200,
}
export const statusCreated: StatusCreated = {
	type: "CREATED",
	code: 201,
}
export const statusBadRequest: StatusBadRequest = {
	type: "BAD_REQUEST",
	code: 400,
}
export const statusForbidden: StatusForbidden = {
	type: "FORBIDDEN",
	code: 403,
}
export const statusUnprocessableEntity: StatusUnprocessableEntity = {
	type: "UNPROCESSABLE_ENTITY",
	code: 422,
}
export const statusResponseServerError: StatusResponseServerError = {
	type: "SERVER_ERROR",
	code: 503,
}
export const statusInternalError: StatusInternalError = {
	type: "INTERNAL_ERROR",
	code: 1_000,
}
