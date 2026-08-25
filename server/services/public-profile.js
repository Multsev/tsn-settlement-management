export function publicMemberProfile(membership) {
  return {
    id: membership.id,
    name: membership.user.fullName,
    skills: membership.skills.filter(memberSkill => memberSkill.isPublic).map(memberSkill => memberSkill.skill.name),
    streets: [...new Set(membership.properties.map(property => property.street))],
    contact: {
      phone: membership.publicPhone ? membership.contactPhone : null,
      email: membership.publicEmail ? membership.user.email : null
    }
  };
}
