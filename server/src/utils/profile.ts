export function completeness(u: any): number {
  const checks = [
    !!u.age, !!u.location, !!u.education, !!u.employmentStatus,
    (u.skills?.length ?? 0) > 0, (u.interests?.length ?? 0) > 0, (u.goals?.length ?? 0) > 0,
    !!u.careerProfile?.desiredCareer, u.careerProfile?.yearsOfExperience != null,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
export const isOnboarded = (u: any) => !!(u.education && u.location && u.employmentStatus && (u.goals?.length ?? 0) > 0);

export const serializeDoc = (o: any) => {
  const { _id, __v, ...rest } = o;
  return { id: String(_id), ...rest };
};
