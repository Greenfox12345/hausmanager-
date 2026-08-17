export function canWithdrawTaskProposal(
  proposal: { proposedByMemberId: number; status: string },
  memberId: number,
): boolean {
  return proposal.status === "pending" && proposal.proposedByMemberId === memberId;
}
