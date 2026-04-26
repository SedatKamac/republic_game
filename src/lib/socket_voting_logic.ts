  private autoSubmitBotTeamVotes(room: MockRoom) {
    if (room.phase !== "TEAM_VOTING") return;
    const aliveIds = room.players.filter((p) => p.isAlive).map((p) => p.id);
    for (const pid of aliveIds) {
      if (pid === this.playerId) continue;
      if (room.teamVotes[pid]) continue;
      // Bots usually approve (80%), unless they are traitors and team is all loyalists (or vice versa)
      // For simplicity, 80% approve
      room.teamVotes[pid] = Math.random() < 0.8 ? "APPROVE" : "REJECT";
    }
    if (this.allAliveTeamVoted(room)) {
      if (room.timer) clearTimeout(room.timer);
      this.resolveTeamVoting(room);
    }
  }

  private allAliveTeamVoted(room: MockRoom) {
    return room.players.filter((p) => p.isAlive).every((p) => room.teamVotes[p.id]);
  }

  private handleTeamVoteSubmit(payload: { vote: TeamVote }) {
    const room = this.room;
    if (!room) return;
    if (room.phase !== "TEAM_VOTING") return;
    const me = room.players.find((p) => p.id === this.playerId);
    if (!me?.isAlive) return;
    if (room.teamVotes[this.playerId]) return;

    // Check if using double vote
    if (payload.vote === "DOUBLE_APPROVE") {
      if (me.doubleApproveUsed) return; // already used
      me.doubleApproveUsed = true;
    } else if (payload.vote === "DOUBLE_REJECT") {
      if (me.doubleRejectUsed) return; // already used
      me.doubleRejectUsed = true;
    }

    room.teamVotes[this.playerId] = payload.vote;
    if (this.allAliveTeamVoted(room)) {
      if (room.timer) clearTimeout(room.timer);
      this.resolveTeamVoting(room);
    }
  }

  private resolveTeamVoting(room: MockRoom) {
    let approveScore = 0;
    let rejectScore = 0;

    for (const pid in room.teamVotes) {
      const vote = room.teamVotes[pid];
      const weight = (vote === "DOUBLE_APPROVE" || vote === "DOUBLE_REJECT") ? 2 : 1;
      if (vote === "APPROVE" || vote === "DOUBLE_APPROVE") approveScore += weight;
      else rejectScore += weight;
    }

    const approved = approveScore > rejectScore;
    room.lastTeamVote = { tallies: { ...room.teamVotes }, approved };

    this.fire("team:voteResult", room.lastTeamVote);

    this.transition(room, "RESULT_REVEAL", 4000, () => {
      if (approved) {
        this.beginSecretAction(room);
      } else {
        // Rotate president and go back to team selection
        do {
          room.presidentRotationIndex = (room.presidentRotationIndex + 1) % room.players.length;
        } while (!room.players[room.presidentRotationIndex].isAlive);
        
        // Back to team selection
        this.transition(room, "TEAM_SELECTION", 30_000, () => this.autoPickTeamIfNeeded(room));
      }
    });
  }
