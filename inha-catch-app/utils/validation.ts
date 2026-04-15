export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) {
    return '비밀번호는 8자 이상이어야 합니다.';
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return '비밀번호는 영문과 숫자를 모두 포함해야 합니다.';
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) {
    return '이메일을 입력해주세요.';
  }
  if (!/^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email.trim())) {
    return '올바른 이메일 형식이 아닙니다.';
  }
  return null;
}
