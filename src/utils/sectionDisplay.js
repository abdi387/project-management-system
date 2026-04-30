export const buildSectionNameMap = (sections = []) =>
  sections.reduce((map, section) => {
    if (section?.id && section?.name) {
      map[section.id] = section.name;
    }
    return map;
  }, {});

export const resolveSectionName = (sectionValue, sectionNameMap = {}) => {
  if (!sectionValue) return 'N/A';
  return sectionNameMap[sectionValue] || sectionValue;
};

export const getMemberSectionName = (member, sectionNameMap = {}) => {
  if (!member) return 'N/A';

  if (member.Section?.name) {
    return member.Section.name;
  }

  return resolveSectionName(member.section, sectionNameMap);
};

export const formatGroupDisplayName = (group, sectionNameMap = {}) => {
  const rawName = group?.name || 'Unnamed Group';
  const firstMember = group?.Members?.[0];
  const sectionValue = firstMember?.section;
  const sectionName = getMemberSectionName(firstMember, sectionNameMap);

  if (!sectionValue) {
    return rawName;
  }

  if (rawName.includes(`(Sec ${sectionValue})`)) {
    return rawName.replace(`(Sec ${sectionValue})`, `(Sec ${sectionName})`);
  }

  if (/\(Sec .+\)/.test(rawName)) {
    return rawName.replace(/\(Sec .+\)/, `(Sec ${sectionName})`);
  }

  return rawName;
};

export const cleanGroupName = (groupName) => {
  if (!groupName) return 'N/A';
  return String(groupName).replace(/\(Sec [^)]+\)/, '').trim();
};
