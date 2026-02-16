package history

type UpdateRequest struct {
	Rating *int    `json:"rating"`
	Notes  *string `json:"notes"`
}
