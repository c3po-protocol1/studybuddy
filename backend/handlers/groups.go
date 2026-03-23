package handlers

import (
	"net/http"
	"time"

	"studybuddy-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GroupHandler struct {
	DB *gorm.DB
}

// CreateGroup creates a new study group and adds the owner as a member.
func (h *GroupHandler) CreateGroup(c *gin.Context) {
	userID, _ := c.Get("userID")

	var body struct {
		Name        string `json:"name" binding:"required"`
		Emoji       string `json:"emoji"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if body.Emoji == "" {
		body.Emoji = "📖"
	}

	groupID := uuid.New().String()
	now := time.Now()

	group := models.StudyGroup{
		ID:          groupID,
		Name:        body.Name,
		Emoji:       body.Emoji,
		Description: body.Description,
		OwnerID:     userID.(string),
		CreatedAt:   now,
	}
	if err := h.DB.Create(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create group"})
		return
	}

	// Add owner as a member
	member := models.GroupMember{
		ID:       uuid.New().String(),
		GroupID:  groupID,
		UserID:   userID.(string),
		Role:     "owner",
		JoinedAt: now,
	}
	h.DB.Create(&member)

	group.MemberCount = 1
	c.JSON(http.StatusCreated, group)
}

// ListGroups lists all groups the current user is a member of.
func (h *GroupHandler) ListGroups(c *gin.Context) {
	userID, _ := c.Get("userID")

	var memberEntries []models.GroupMember
	h.DB.Where("\"userId\" = ?", userID.(string)).Find(&memberEntries)

	if len(memberEntries) == 0 {
		c.JSON(http.StatusOK, []models.StudyGroup{})
		return
	}

	groupIDs := make([]string, len(memberEntries))
	for i, m := range memberEntries {
		groupIDs[i] = m.GroupID
	}

	var groups []models.StudyGroup
	h.DB.Where("id IN ?", groupIDs).Order("\"createdAt\" DESC").Find(&groups)

	// Attach member counts
	for i := range groups {
		var count int64
		h.DB.Model(&models.GroupMember{}).Where("\"groupId\" = ? AND role != 'pending'", groups[i].ID).Count(&count)
		groups[i].MemberCount = int(count)
	}

	c.JSON(http.StatusOK, groups)
}

// GetGroup returns a group with its members and linked spaces.
func (h *GroupHandler) GetGroup(c *gin.Context) {
	groupID := c.Param("id")

	var group models.StudyGroup
	if err := h.DB.First(&group, "id = ?", groupID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "group not found"})
		return
	}

	// Get members with emails
	var members []models.GroupMember
	h.DB.Where("\"groupId\" = ?", groupID).Find(&members)
	group.Members = members

	// Get linked spaces
	var groupSpaces []models.GroupSpace
	h.DB.Where("\"groupId\" = ?", groupID).Find(&groupSpaces)

	if len(groupSpaces) > 0 {
		spaceIDs := make([]string, len(groupSpaces))
		for i, gs := range groupSpaces {
			spaceIDs[i] = gs.SpaceID
		}
		var spaces []models.Space
		h.DB.Where("id IN ?", spaceIDs).Find(&spaces)
		group.Spaces = spaces
	} else {
		group.Spaces = []models.Space{}
	}

	group.MemberCount = len(members)
	c.JSON(http.StatusOK, group)
}

// InviteMember invites a user by email to a group as a pending member.
func (h *GroupHandler) InviteMember(c *gin.Context) {
	groupID := c.Param("id")

	var body struct {
		Email string `json:"email" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find the user by email
	var invitee models.User
	if err := h.DB.First(&invitee, "email = ?", body.Email).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "사용자를 찾을 수 없습니다"})
		return
	}

	// Check if already a member
	var existing models.GroupMember
	if err := h.DB.Where("\"groupId\" = ? AND \"userId\" = ?", groupID, invitee.ID).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "이미 그룹 멤버입니다"})
		return
	}

	member := models.GroupMember{
		ID:       uuid.New().String(),
		GroupID:  groupID,
		UserID:   invitee.ID,
		Role:     "pending",
		Email:    body.Email,
		JoinedAt: time.Now(),
	}
	if err := h.DB.Create(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to invite member"})
		return
	}

	c.JSON(http.StatusCreated, member)
}

// JoinGroup accepts a pending invite for the current user.
func (h *GroupHandler) JoinGroup(c *gin.Context) {
	groupID := c.Param("id")
	userID, _ := c.Get("userID")

	var member models.GroupMember
	if err := h.DB.Where("\"groupId\" = ? AND \"userId\" = ? AND role = 'pending'", groupID, userID.(string)).First(&member).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "초대를 찾을 수 없습니다"})
		return
	}

	h.DB.Model(&member).Update("role", "member")
	member.Role = "member"
	c.JSON(http.StatusOK, member)
}

// LinkSpace links a space to a group.
func (h *GroupHandler) LinkSpace(c *gin.Context) {
	groupID := c.Param("id")

	var body struct {
		SpaceID string `json:"spaceId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check space exists
	var space models.Space
	if err := h.DB.First(&space, "id = ?", body.SpaceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "space not found"})
		return
	}

	// Check not already linked
	var existing models.GroupSpace
	if err := h.DB.Where("\"groupId\" = ? AND \"spaceId\" = ?", groupID, body.SpaceID).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "이미 공유된 공간입니다"})
		return
	}

	gs := models.GroupSpace{
		ID:      uuid.New().String(),
		GroupID: groupID,
		SpaceID: body.SpaceID,
	}
	if err := h.DB.Create(&gs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to link space"})
		return
	}

	c.JSON(http.StatusCreated, gs)
}

// RemoveMember removes a member from a group.
func (h *GroupHandler) RemoveMember(c *gin.Context) {
	groupID := c.Param("id")
	targetUserID := c.Param("userId")

	result := h.DB.Where("\"groupId\" = ? AND \"userId\" = ?", groupID, targetUserID).Delete(&models.GroupMember{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove member"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "멤버를 찾을 수 없습니다"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
