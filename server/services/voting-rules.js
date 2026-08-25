export function calculatePollResult(poll, now = new Date()) {
  const supportVotes = poll.votes.filter(vote => vote.choice === 'SUPPORT').length;
  const opposeVotes = poll.votes.filter(vote => vote.choice === 'OPPOSE').length;
  const totalVotes = supportVotes + opposeVotes;
  const quorumNeeded = Math.ceil(poll.eligibleVoters * poll.quorumPercent / 100);
  const approvalRate = totalVotes ? supportVotes / totalVotes * 100 : 0;
  const quorumReached = totalVotes >= quorumNeeded;
  const approvalReached = approvalRate >= poll.approvalPercent;
  const closed = now >= poll.closesAt;
  return { supportVotes, opposeVotes, totalVotes, quorumNeeded, approvalRate, quorumReached, approvalReached, closed, passed: closed && quorumReached && approvalReached };
}

export function canCreateProjectFromPoll(poll, now) {
  return calculatePollResult(poll, now).passed;
}
