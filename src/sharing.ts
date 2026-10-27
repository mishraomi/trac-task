import { arrayRemove, arrayUnion, collection, deleteField, doc, getDocs, limit, query, updateDoc, where, type Firestore } from 'firebase/firestore'

export type MemberAccess = 'edit' | 'read'

export async function findUserByEmail(db: Firestore, email: string) {
  const result = await getDocs(query(collection(db, 'users'), where('emailLower', '==', email.trim().toLowerCase()), limit(1)))
  return result.empty ? null : { uid: result.docs[0].id, ...result.docs[0].data() }
}

export async function shareList(db: Firestore, listId: string, ownerId: string, email: string, access: MemberAccess) {
  const member = await findUserByEmail(db, email)
  if (!member) throw new Error('No Trac account found for this email address.')
  if (member.uid === ownerId) throw new Error('You already own this list.')
  await updateDoc(doc(db, 'lists', listId), {
    memberIds: arrayUnion(member.uid),
    ['memberRoles.' + member.uid]: 'member',
    ['memberAccess.' + member.uid]: access,
  })
  return member
}

export async function updateMemberAccess(db: Firestore, listId: string, uid: string, access: MemberAccess) {
  await updateDoc(doc(db, 'lists', listId), { ['memberAccess.' + uid]: access })
}

export async function removeMember(db: Firestore, listId: string, uid: string) {
  await updateDoc(doc(db, 'lists', listId), {
    memberIds: arrayRemove(uid),
    ['memberRoles.' + uid]: deleteField(),
    ['memberAccess.' + uid]: deleteField(),
  })
}
