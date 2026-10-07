import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
}

// Friendly Korean error messages for elders and everyday users
export function getFriendlyAuthErrorMessage(errorCodeOrMessage: string): string {
  const code = (errorCodeOrMessage || '').toLowerCase();
  
  if (code.includes('weak-password') || code.includes('password should be at least 6') || code.includes('비밀번호는 6')) {
    return '비밀번호는 최소 6자리 이상 입력해 주셔야 안전하게 가입하실 수 있습니다.';
  }
  if (code.includes('email-already-in-use')) {
    return '이미 가입되어 있는 이메일 주소입니다. 기존 계정으로 로그인해 주세요.';
  }
  if (code.includes('invalid-email')) {
    return '올바른 이메일 형식(예: user@example.com)을 입력해 주세요.';
  }
  if (
    code.includes('wrong-password') || 
    code.includes('invalid-credential') || 
    code.includes('user-not-found')
  ) {
    return '이메일 또는 비밀번호가 맞지 않습니다. 입력하신 정보를 다시 확인해 주세요.';
  }
  if (code.includes('too-many-requests')) {
    return '비밀번호 입력을 여러 번 실패했습니다. 보안을 위해 잠시 후 다시 시도해 주세요.';
  }
  if (code.includes('network-request-failed')) {
    return '인터넷 연결이 불안정합니다. 네트워크 상태를 확인해 주세요.';
  }
  return '처리 중 오류가 발생했습니다. 입력하신 정보를 다시 확인해 주세요.';
}

// 회원가입 (이름, 이메일, 비밀번호)
export async function registerWithEmail(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();

  if (!trimmedName) {
    throw new Error('이름(성함)을 입력해 주세요.');
  }
  if (!trimmedEmail) {
    throw new Error('이메일 주소를 입력해 주세요.');
  }
  if (password.length < 6) {
    throw new Error('비밀번호는 최소 6자리 이상이어야 합니다.');
  }

  // 1. Firebase Auth 계정 생성
  const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
  const user = userCredential.user;

  // 2. 프로필 이름(displayName) 저장
  await updateProfile(user, {
    displayName: trimmedName
  });

  // 3. Firestore users 컬렉션에 프로필 저장
  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      displayName: trimmedName,
      email: trimmedEmail,
      createdAt: new Date().toISOString(),
      firestoreCreatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('사용자 프로필 문서 저장 건너뜀:', err);
  }

  return user;
}

// 로그인 (이메일, 비밀번호)
export async function loginWithEmail(email: string, password: string): Promise<User> {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    throw new Error('이메일 주소를 입력해 주세요.');
  }
  if (!password) {
    throw new Error('비밀번호를 입력해 주세요.');
  }
  if (password.length < 6) {
    throw new Error('비밀번호는 6자리 이상입니다. 비밀번호를 다시 확인해 주세요.');
  }

  const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
  return userCredential.user;
}

// 로그아웃
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// 현재 사용자 상태 구독
export function subscribeToUserAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    // Only consider non-anonymous users as logged-in members
    if (user && !user.isAnonymous) {
      callback(user);
    } else {
      callback(null);
    }
  });
}
