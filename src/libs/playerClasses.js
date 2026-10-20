// Class templates must not share mutable skills/benefits with character sheets.
export function createPlayerClass(template, { name = template.name, isHomebrew = false } = {}) {
  const instance = JSON.parse(JSON.stringify(template));
  return {
    ...instance,
    name,
    lvl: 1,
    skills: instance.skills.sort((a, b) => a.skillName.localeCompare(b.skillName)),
    heroic: { name: '', description: '' },
    spells: [],
    isHomebrew,
  };
}

export function canPerformRitualism(player) {
  return (player.classes || []).some(klass =>
    klass.benefits?.rituals?.ritualism ||
    klass.skills?.some(skill => Number(skill.currentLvl) > 0 && skill.specialSkill === 'Ritualism')
  );
}
