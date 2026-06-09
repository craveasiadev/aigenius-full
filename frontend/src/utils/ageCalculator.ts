export function calculateAge(dateOfBirth: string | Date | null | undefined): number | null {
  if (!dateOfBirth) {
    return null;
  }

  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;

  if (isNaN(dob.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

export function formatAge(age: number | null | undefined): string {
  if (age === null || age === undefined) {
    return 'N/A';
  }

  return `${age} years old`;
}
