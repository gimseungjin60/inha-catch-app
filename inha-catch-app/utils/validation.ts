// 클라이언트 검증 — UX 용도. 최종 검증은 서버 PasswordPolicy 가 담당.
// 정책이 서버 PasswordPolicy.java 와 일치해야 함.

const COMMON_WEAK = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwerty', 'qwerty123', 'asdf1234', 'abc12345', 'abcd1234', '1q2w3e4r',
  'iloveyou', 'admin123', 'letmein', 'welcome1', 'welcome123',
  'passw0rd', 'p@ssword', 'qwer1234', 'test1234', 'test12345',
  'user1234', 'guest1234', 'demo1234', 'inha1234', 'inhacatch',
  'inha12345', 'student1', 'happy1234', 'love1234',
])

export function validatePassword(password: string, email?: string): string | null {
  if (!password) return '비밀번호를 입력해주세요.'
  if (password.length < 8) return '비밀번호는 8자 이상이어야 해요.'
  if (password.length > 64) return '비밀번호는 64자 이하여야 해요.'
  if (password.includes(' ')) return '비밀번호에 공백은 사용할 수 없어요.'
  if (!/[a-zA-Z]/.test(password)) return '비밀번호에 영문자가 포함되어야 해요.'
  if (!/[0-9]/.test(password)) return '비밀번호에 숫자가 포함되어야 해요.'
  if (/(.)\1{3,}/.test(password)) return '같은 문자를 4번 이상 연속해서 사용할 수 없어요.'

  const lower = password.toLowerCase()
  if (COMMON_WEAK.has(lower)) return '너무 흔한 비밀번호예요. 다른 비밀번호를 사용해주세요.'

  if (email && email.trim()) {
    const local = email.includes('@') ? email.slice(0, email.indexOf('@')) : email
    if (local && lower === local.toLowerCase()) {
      return '이메일과 동일한 비밀번호는 사용할 수 없어요.'
    }
  }

  return null
}

export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) return '이메일을 입력해주세요.'
  if (!/^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email.trim())) {
    return '올바른 이메일 형식이 아닙니다.'
  }
  return null
}
