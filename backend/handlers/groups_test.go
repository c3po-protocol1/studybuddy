package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"studybuddy-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// setupTestDB creates an in-memory SQLite database with all tables.
func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	if err := db.AutoMigrate(
		&models.User{},
		&models.Space{},
		&models.StudyGroup{},
		&models.GroupMember{},
		&models.GroupSpace{},
	); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

// seedUser inserts a test user and returns the ID.
func seedUser(t *testing.T, db *gorm.DB, email string) string {
	t.Helper()
	id := uuid.New().String()
	user := models.User{ID: id, Email: email, Password: "hashed"}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	return id
}

// seedSpace inserts a test space and returns the ID.
func seedSpace(t *testing.T, db *gorm.DB, userID, name string) string {
	t.Helper()
	id := uuid.New().String()
	space := models.Space{ID: id, Name: name, Emoji: "📚", Color: "#6366f1", UserID: userID}
	if err := db.Create(&space).Error; err != nil {
		t.Fatalf("failed to seed space: %v", err)
	}
	return id
}

// jsonCtx creates a gin test context with JSON body and user ID in context.
func jsonCtx(t *testing.T, method, path string, body interface{}, userID string) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()

	var reqBody []byte
	if body != nil {
		var err error
		reqBody, err = json.Marshal(body)
		if err != nil {
			t.Fatalf("failed to marshal body: %v", err)
		}
	}

	req := httptest.NewRequest(method, path, bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	if userID != "" {
		c.Set("userID", userID)
	}
	return c, w
}

// parseJSON parses the response body into a map.
func parseJSON(t *testing.T, w *httptest.ResponseRecorder) map[string]interface{} {
	t.Helper()
	var result map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("failed to parse JSON: %v — body: %s", err, w.Body.String())
	}
	return result
}

// ── CreateGroup Tests ─────────────────────────────────────────────────────────

func TestCreateGroup_Success(t *testing.T) {
	db := setupTestDB(t)
	userID := seedUser(t, db, "owner@test.com")
	h := &GroupHandler{DB: db}

	body := map[string]string{
		"name":        "수학 스터디",
		"emoji":       "🧮",
		"description": "수학을 함께 공부해요",
	}
	c, w := jsonCtx(t, http.MethodPost, "/api/groups", body, userID)
	h.CreateGroup(c)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d — body: %s", w.Code, w.Body.String())
	}

	result := parseJSON(t, w)
	if result["name"] != "수학 스터디" {
		t.Errorf("expected name '수학 스터디', got %v", result["name"])
	}
	if result["ownerId"] != userID {
		t.Errorf("expected ownerId %s, got %v", userID, result["ownerId"])
	}

	// Owner should be auto-added as member
	var memberCount int64
	db.Model(&models.GroupMember{}).Where("\"groupId\" = ?", result["id"]).Count(&memberCount)
	if memberCount != 1 {
		t.Errorf("expected 1 member (owner), got %d", memberCount)
	}
}

func TestCreateGroup_MissingName_Returns400(t *testing.T) {
	db := setupTestDB(t)
	userID := seedUser(t, db, "owner@test.com")
	h := &GroupHandler{DB: db}

	body := map[string]string{"emoji": "🧮"}
	c, w := jsonCtx(t, http.MethodPost, "/api/groups", body, userID)
	h.CreateGroup(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ── ListGroups Tests ──────────────────────────────────────────────────────────

func TestListGroups_ReturnsUserGroups(t *testing.T) {
	db := setupTestDB(t)
	userID := seedUser(t, db, "user@test.com")
	otherID := seedUser(t, db, "other@test.com")
	h := &GroupHandler{DB: db}

	// Create two groups — user is a member of one
	g1 := models.StudyGroup{ID: uuid.New().String(), Name: "Group A", Emoji: "📖", OwnerID: userID}
	g2 := models.StudyGroup{ID: uuid.New().String(), Name: "Group B", Emoji: "📖", OwnerID: otherID}
	db.Create(&g1)
	db.Create(&g2)

	db.Create(&models.GroupMember{ID: uuid.New().String(), GroupID: g1.ID, UserID: userID, Role: "owner"})
	db.Create(&models.GroupMember{ID: uuid.New().String(), GroupID: g2.ID, UserID: otherID, Role: "owner"})

	c, w := jsonCtx(t, http.MethodGet, "/api/groups", nil, userID)
	h.ListGroups(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}

	var groups []map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &groups)
	if len(groups) != 1 {
		t.Errorf("expected 1 group for user, got %d", len(groups))
	}
}

// ── GetGroup Tests ────────────────────────────────────────────────────────────

func TestGetGroup_ReturnsGroupWithMembersAndSpaces(t *testing.T) {
	db := setupTestDB(t)
	userID := seedUser(t, db, "user@test.com")
	h := &GroupHandler{DB: db}

	groupID := uuid.New().String()
	db.Create(&models.StudyGroup{ID: groupID, Name: "Test Group", Emoji: "📖", OwnerID: userID})
	db.Create(&models.GroupMember{ID: uuid.New().String(), GroupID: groupID, UserID: userID, Role: "owner", Email: "user@test.com"})

	spaceID := seedSpace(t, db, userID, "Math Space")
	db.Create(&models.GroupSpace{ID: uuid.New().String(), GroupID: groupID, SpaceID: spaceID})

	c, w := jsonCtx(t, http.MethodGet, "/api/groups/"+groupID, nil, userID)
	c.Params = gin.Params{{Key: "id", Value: groupID}}
	h.GetGroup(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}

	result := parseJSON(t, w)
	members, ok := result["members"].([]interface{})
	if !ok || len(members) != 1 {
		t.Errorf("expected 1 member, got %v", result["members"])
	}
	spaces, ok := result["spaces"].([]interface{})
	if !ok || len(spaces) != 1 {
		t.Errorf("expected 1 space, got %v", result["spaces"])
	}
}

func TestGetGroup_NotFound_Returns404(t *testing.T) {
	db := setupTestDB(t)
	userID := seedUser(t, db, "user@test.com")
	h := &GroupHandler{DB: db}

	c, w := jsonCtx(t, http.MethodGet, "/api/groups/nonexistent", nil, userID)
	c.Params = gin.Params{{Key: "id", Value: "nonexistent"}}
	h.GetGroup(c)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// ── InviteMember Tests ────────────────────────────────────────────────────────

func TestInviteMember_Success(t *testing.T) {
	db := setupTestDB(t)
	ownerID := seedUser(t, db, "owner@test.com")
	inviteeID := seedUser(t, db, "invitee@test.com")
	h := &GroupHandler{DB: db}

	groupID := uuid.New().String()
	db.Create(&models.StudyGroup{ID: groupID, Name: "Group", Emoji: "📖", OwnerID: ownerID})
	db.Create(&models.GroupMember{ID: uuid.New().String(), GroupID: groupID, UserID: ownerID, Role: "owner"})

	body := map[string]string{"email": "invitee@test.com"}
	c, w := jsonCtx(t, http.MethodPost, "/api/groups/"+groupID+"/invite", body, ownerID)
	c.Params = gin.Params{{Key: "id", Value: groupID}}
	h.InviteMember(c)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d — body: %s", w.Code, w.Body.String())
	}

	// invitee should now be a pending member
	var member models.GroupMember
	err := db.Where("\"groupId\" = ? AND \"userId\" = ?", groupID, inviteeID).First(&member).Error
	if err != nil {
		t.Fatalf("expected member record, got error: %v", err)
	}
	if member.Role != "pending" {
		t.Errorf("expected role 'pending', got %q", member.Role)
	}
}

func TestInviteMember_UserNotFound_Returns404(t *testing.T) {
	db := setupTestDB(t)
	ownerID := seedUser(t, db, "owner@test.com")
	h := &GroupHandler{DB: db}

	groupID := uuid.New().String()
	db.Create(&models.StudyGroup{ID: groupID, Name: "Group", Emoji: "📖", OwnerID: ownerID})
	db.Create(&models.GroupMember{ID: uuid.New().String(), GroupID: groupID, UserID: ownerID, Role: "owner"})

	body := map[string]string{"email": "nobody@test.com"}
	c, w := jsonCtx(t, http.MethodPost, "/api/groups/"+groupID+"/invite", body, ownerID)
	c.Params = gin.Params{{Key: "id", Value: groupID}}
	h.InviteMember(c)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d — body: %s", w.Code, w.Body.String())
	}
}

func TestInviteMember_AlreadyMember_Returns409(t *testing.T) {
	db := setupTestDB(t)
	ownerID := seedUser(t, db, "owner@test.com")
	memberID := seedUser(t, db, "member@test.com")
	h := &GroupHandler{DB: db}

	groupID := uuid.New().String()
	db.Create(&models.StudyGroup{ID: groupID, Name: "Group", Emoji: "📖", OwnerID: ownerID})
	db.Create(&models.GroupMember{ID: uuid.New().String(), GroupID: groupID, UserID: ownerID, Role: "owner"})
	db.Create(&models.GroupMember{ID: uuid.New().String(), GroupID: groupID, UserID: memberID, Role: "member"})

	body := map[string]string{"email": "member@test.com"}
	c, w := jsonCtx(t, http.MethodPost, "/api/groups/"+groupID+"/invite", body, ownerID)
	c.Params = gin.Params{{Key: "id", Value: groupID}}
	h.InviteMember(c)

	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w.Code)
	}
}

// ── JoinGroup Tests ───────────────────────────────────────────────────────────

func TestJoinGroup_AcceptsPendingInvite(t *testing.T) {
	db := setupTestDB(t)
	ownerID := seedUser(t, db, "owner@test.com")
	memberID := seedUser(t, db, "member@test.com")
	h := &GroupHandler{DB: db}

	groupID := uuid.New().String()
	db.Create(&models.StudyGroup{ID: groupID, Name: "Group", Emoji: "📖", OwnerID: ownerID})
	db.Create(&models.GroupMember{ID: uuid.New().String(), GroupID: groupID, UserID: memberID, Role: "pending", Email: "member@test.com"})

	c, w := jsonCtx(t, http.MethodPost, "/api/groups/"+groupID+"/join", nil, memberID)
	c.Params = gin.Params{{Key: "id", Value: groupID}}
	h.JoinGroup(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}

	var member models.GroupMember
	db.Where("\"groupId\" = ? AND \"userId\" = ?", groupID, memberID).First(&member)
	if member.Role != "member" {
		t.Errorf("expected role 'member' after join, got %q", member.Role)
	}
}

func TestJoinGroup_NoPendingInvite_Returns404(t *testing.T) {
	db := setupTestDB(t)
	seedUser(t, db, "owner@test.com")
	memberID := seedUser(t, db, "member@test.com")
	h := &GroupHandler{DB: db}

	groupID := uuid.New().String()
	db.Create(&models.StudyGroup{ID: groupID, Name: "Group", Emoji: "📖", OwnerID: "owner"})

	c, w := jsonCtx(t, http.MethodPost, "/api/groups/"+groupID+"/join", nil, memberID)
	c.Params = gin.Params{{Key: "id", Value: groupID}}
	h.JoinGroup(c)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// ── LinkSpace Tests ───────────────────────────────────────────────────────────

func TestLinkSpace_Success(t *testing.T) {
	db := setupTestDB(t)
	userID := seedUser(t, db, "user@test.com")
	h := &GroupHandler{DB: db}

	groupID := uuid.New().String()
	db.Create(&models.StudyGroup{ID: groupID, Name: "Group", Emoji: "📖", OwnerID: userID})
	db.Create(&models.GroupMember{ID: uuid.New().String(), GroupID: groupID, UserID: userID, Role: "owner"})

	spaceID := seedSpace(t, db, userID, "My Space")

	body := map[string]string{"spaceId": spaceID}
	c, w := jsonCtx(t, http.MethodPost, "/api/groups/"+groupID+"/spaces", body, userID)
	c.Params = gin.Params{{Key: "id", Value: groupID}}
	h.LinkSpace(c)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d — body: %s", w.Code, w.Body.String())
	}

	var count int64
	db.Model(&models.GroupSpace{}).Where("\"groupId\" = ? AND \"spaceId\" = ?", groupID, spaceID).Count(&count)
	if count != 1 {
		t.Errorf("expected 1 group-space link, got %d", count)
	}
}

// ── RemoveMember Tests ────────────────────────────────────────────────────────

func TestRemoveMember_OwnerCanRemoveMember(t *testing.T) {
	db := setupTestDB(t)
	ownerID := seedUser(t, db, "owner@test.com")
	memberID := seedUser(t, db, "member@test.com")
	h := &GroupHandler{DB: db}

	groupID := uuid.New().String()
	db.Create(&models.StudyGroup{ID: groupID, Name: "Group", Emoji: "📖", OwnerID: ownerID})
	db.Create(&models.GroupMember{ID: uuid.New().String(), GroupID: groupID, UserID: ownerID, Role: "owner"})
	db.Create(&models.GroupMember{ID: uuid.New().String(), GroupID: groupID, UserID: memberID, Role: "member"})

	c, w := jsonCtx(t, http.MethodDelete, "/api/groups/"+groupID+"/members/"+memberID, nil, ownerID)
	c.Params = gin.Params{{Key: "id", Value: groupID}, {Key: "userId", Value: memberID}}
	h.RemoveMember(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}

	var count int64
	db.Model(&models.GroupMember{}).Where("\"groupId\" = ? AND \"userId\" = ?", groupID, memberID).Count(&count)
	if count != 0 {
		t.Errorf("expected member to be removed, got count %d", count)
	}
}

// ── ReorderSpaces Tests ───────────────────────────────────────────────────────

func TestReorderSpaces_Success(t *testing.T) {
	db := setupTestDB(t)
	userID := seedUser(t, db, "user@test.com")
	h := &SpaceHandler{DB: db}

	id1 := seedSpace(t, db, userID, "Space 1")
	id2 := seedSpace(t, db, userID, "Space 2")
	id3 := seedSpace(t, db, userID, "Space 3")

	// Reorder: 3, 1, 2
	body := map[string]interface{}{"orderedIds": []string{id3, id1, id2}}
	c, w := jsonCtx(t, http.MethodPut, "/api/spaces/reorder", body, userID)
	h.ReorderSpaces(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}

	var s1, s2, s3 models.Space
	db.First(&s1, "id = ?", id1)
	db.First(&s2, "id = ?", id2)
	db.First(&s3, "id = ?", id3)

	if s3.SortOrder != 0 {
		t.Errorf("expected Space 3 sortOrder=0, got %d", s3.SortOrder)
	}
	if s1.SortOrder != 1 {
		t.Errorf("expected Space 1 sortOrder=1, got %d", s1.SortOrder)
	}
	if s2.SortOrder != 2 {
		t.Errorf("expected Space 2 sortOrder=2, got %d", s2.SortOrder)
	}
}

func TestReorderSpaces_EmptyIds_Returns400(t *testing.T) {
	db := setupTestDB(t)
	userID := seedUser(t, db, "user@test.com")
	h := &SpaceHandler{DB: db}

	body := map[string]interface{}{"orderedIds": []string{}}
	c, w := jsonCtx(t, http.MethodPut, "/api/spaces/reorder", body, userID)
	h.ReorderSpaces(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}
