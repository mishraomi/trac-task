import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  type DocumentData,
  type DocumentReference,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowLeft,
  Bell,
  Check,
  ChevronDown,
  Cog,
  Eye,
  EyeOff,
  Home,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  auth,
  db,
  firebaseConfigurationError,
  googleProvider,
} from "./firebase";
import {
  findUserByEmail,
  removeMember,
  updateMemberAccess,
  type MemberAccess,
} from "./sharing";
import "./styles.css";

type Priority = "low" | "medium" | "high";
type Status = "pending" | "completed";
type TaskSort =
  | "createdDesc"
  | "createdAsc"
  | "updatedDesc"
  | "dueAsc"
  | "priorityDesc";
type Modal =
  | "create"
  | "settings"
  | "deleteList"
  | "editTask"
  | "deleteTask"
  | "details"
  | null;
type ListDoc = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  memberIds?: string[];
  memberRoles?: Record<string, string>;
  memberAccess?: Record<string, MemberAccess>;
};
type TaskDoc = {
  id: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  dueDate: Timestamp | null;
  createdById: string;
  createdByName?: string;
  createdAt?: Timestamp | null;
  lastModifiedById?: string;
  lastModifiedByName?: string;
  updatedAt?: Timestamp | null;
};
type TaskActivityAction =
  | "created"
  | "updated"
  | "completed"
  | "reopened"
  | "deleted";
type TaskActivityChange = { field: string; before: string; after: string };
type TaskActivity = {
  id: string;
  taskId: string;
  taskTitle: string;
  action: TaskActivityAction;
  actorId: string;
  actorName: string;
  occurredAt?: Timestamp | null;
  changes?: TaskActivityChange[];
};
type Member = {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: "Owner" | "Member";
  access: "owner" | MemberAccess;
};
const name = (u: User) => u.displayName || u.email?.split("@")[0] || "Account";
const initials = (n: string) =>
  n
    .split(/\s+/)
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";
const date = (d: Timestamp | null | undefined) =>
  d ? d.toDate().toLocaleDateString() : "No due date";
const dateTime = (d: Timestamp | null | undefined) =>
  d ? d.toDate().toLocaleString() : "Not recorded";
const shared = (l: ListDoc) => (l.memberIds || [l.ownerId]).length > 1;
const timestampValue = (value: Timestamp | null | undefined) =>
  value?.toMillis() || 0;
const priorityValue = (priority: Priority) =>
  ({ low: 1, medium: 2, high: 3 })[priority];
const priorityLabel = (priority: Priority) =>
  priority.charAt(0).toUpperCase() + priority.slice(1);
const dueDateValue = (value: Timestamp | null) =>
  value ? value.toDate().toLocaleDateString() : "No due date";

async function commitTaskActivity({
  listId,
  taskRef,
  operation,
  taskData,
  activity,
}: {
  listId: string;
  taskRef: DocumentReference;
  operation: "set" | "update" | "delete";
  taskData?: DocumentData;
  activity: Omit<TaskActivity, "id" | "occurredAt">;
}) {
  if (!db) throw new Error("Firestore is unavailable.");
  const batch = writeBatch(db);
  if (operation === "set") batch.set(taskRef, taskData!);
  if (operation === "update") batch.update(taskRef, taskData!);
  if (operation === "delete") batch.delete(taskRef);
  batch.set(doc(collection(db, "lists", listId, "auditEvents")), {
    ...activity,
    occurredAt: serverTimestamp(),
  });
  await batch.commit();
}

function activityDescription(activity: TaskActivity) {
  const actor = activity.actorName || "Unknown member";
  if (activity.action === "created") return `${actor} created this task`;
  if (activity.action === "completed") return `${actor} completed this task`;
  if (activity.action === "reopened") return `${actor} reopened this task`;
  if (activity.action === "deleted") return `${actor} deleted this task`;
  return `${actor} updated this task`;
}
function Brand() {
  return (
    <div className="brand">
      <i>
        <Check />
      </i>
      <b>Trac</b>
    </div>
  );
}
function Btn({
  children,
  onClick,
  kind = "primary",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={"btn " + kind}
    >
      {children}
    </button>
  );
}
function Avatar({
  n,
  url,
  small = false,
}: {
  n: string;
  url?: string;
  small?: boolean;
}) {
  return url ? (
    <img
      className={"avatar " + (small ? "small" : "")}
      src={url}
      alt=""
      referrerPolicy="no-referrer"
    />
  ) : (
    <span className={"avatar " + (small ? "small" : "")}>{initials(n)}</span>
  );
}
function Field({
  value,
  set,
  placeholder,
  password = false,
}: {
  value: string;
  set: (x: string) => void;
  placeholder: string;
  password?: boolean;
}) {
  const [v, setV] = useState(false);
  return (
    <label className="field">
      {password && <Lock />}
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        type={password && !v ? "password" : "text"}
      />
      {password && (
        <button type="button" onClick={() => setV(!v)}>
          {v ? <EyeOff /> : <Eye />}
        </button>
      )}
    </label>
  );
}
// Keep email/password authentication ready for a later release without exposing it now.
const EMAIL_PASSWORD_AUTH_ENABLED = false;

function Auth() {
  const [reg, setReg] = useState(false),
    [email, setEmail] = useState(""),
    [pass, setPass] = useState(""),
    [confirm, setConfirm] = useState(""),
    [full, setFull] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth)
      return setError(firebaseConfigurationError || "Firebase is unavailable.");
    if (reg && pass !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    setError("");
    try {
      if (reg) {
        const r = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(r.user, { displayName: full.trim() });
      } else await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      setError((e as Error).message.replace("Firebase: ", ""));
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    if (!auth) return;
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError((e as Error).message.replace("Firebase: ", ""));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-shell trac-auth-page">
      <section className="auth-art">
        <div>
          <Brand />
          <h1>
            Organize
            <br />
            Your Life
            <br />
            <strong>Together</strong>
          </h1>
          <p>Create todo lists, stay on track, and collaborate with others.</p>
        </div>
      </section>
      <section className="auth-pane">
        <form
          className={"auth-card trac-auth-card " + (reg ? "register-card" : "")}
          onSubmit={submit}
        >
          {EMAIL_PASSWORD_AUTH_ENABLED && (
            <div className="tabs">
              <button
                type="button"
                className={!reg ? "active" : ""}
                onClick={() => setReg(false)}
              >
                Login
              </button>
              <button
                type="button"
                className={reg ? "active" : ""}
                onClick={() => setReg(true)}
              >
                Register
              </button>
            </div>
          )}
          <h2>
            {EMAIL_PASSWORD_AUTH_ENABLED
              ? reg
                ? "Create an account"
                : "Welcome back"
              : "Welcome to Trac"}
          </h2>
          <p>
            {EMAIL_PASSWORD_AUTH_ENABLED
              ? reg
                ? "Join Trac and start organizing."
                : "Login to your account"
              : "Sign in with Google to start organizing."}
          </p>
          {EMAIL_PASSWORD_AUTH_ENABLED && reg && (
            <>
              <label className="lab">Full name</label>
              <Field value={full} set={setFull} placeholder="John Doe" />
            </>
          )}
          {EMAIL_PASSWORD_AUTH_ENABLED && (
            <>
              <label className="lab">Email address</label>
              <Field value={email} set={setEmail} placeholder="Email address" />
              <label className="lab">Password</label>
              <Field value={pass} set={setPass} placeholder="Password" password />
              {reg && (
                <>
                  <label className="lab">Confirm password</label>
                  <Field
                    value={confirm}
                    set={setConfirm}
                    placeholder="Confirm password"
                    password
                  />
                </>
              )}
              <button className="btn primary auth-submit" disabled={busy}>
                {busy ? "Please waitâ€¦" : reg ? "Create account" : "Login"}
              </button>
            </>
          )}
          {(!EMAIL_PASSWORD_AUTH_ENABLED || !reg) && (
            <>
              {EMAIL_PASSWORD_AUTH_ENABLED && <div className="or">or continue with</div>}
              <div className="social">
                <button type="button" onClick={google} disabled={busy}>
                  <b>G</b>
                  <span>{busy ? "Signing in…" : "Continue with Google"}</span>
                </button>
              </div>
            </>
          )}
          {error && <p className="auth-message">{error}</p>}
        </form>
      </section>
    </div>
  );
}
function Side({
  section,
  setSection,
}: {
  section: "mine" | "shared";
  setSection: (x: "mine" | "shared") => void;
}) {
  return (
    <aside className="side">
      <Brand />
      <nav>
        <button
          className={section === "mine" ? "on" : ""}
          onClick={() => setSection("mine")}
        >
          <Home />
          My Lists
        </button>
        <button
          className={section === "shared" ? "on" : ""}
          onClick={() => setSection("shared")}
        >
          <Users />
          Shared with me
        </button>
      </nav>
    </aside>
  );
}
function Top({ user }: { user: User }) {
  const [o, setO] = useState(false);
  return (
    <header className="top">
      <div className="top-brand">
        <Brand />
      </div>
      <div>
        <button>
          <Bell />
        </button>
        <div className="account">
          <button onClick={() => setO(!o)}>
            <Avatar n={name(user)} url={user.photoURL || undefined} />
            <span>{name(user)}</span>
            <ChevronDown />
          </button>
          {o && (
            <aside>
              <button onClick={() => auth && signOut(auth)}>
                <ArrowLeft />
                Log out
              </button>
            </aside>
          )}
        </div>
      </div>
    </header>
  );
}
function MobileNav({
  section,
  setSection,
  create,
  canCreate,
}: {
  section: "mine" | "shared";
  setSection: (section: "mine" | "shared") => void;
  create: () => void;
  canCreate: boolean;
}) {
  return (
    <>
      {canCreate && (
        <button className="mobile-create" type="button" onClick={create}>
          <Plus />
          <span>Create list</span>
        </button>
      )}
      <nav className="mobile-nav" aria-label="Primary navigation">
        <button
          type="button"
          className={section === "mine" ? "on" : ""}
          onClick={() => setSection("mine")}
        >
          <Home />
          <span>My Lists</span>
        </button>
        <button
          type="button"
          className={section === "shared" ? "on" : ""}
          onClick={() => setSection("shared")}
        >
          <Users />
          <span>Shared</span>
        </button>
      </nav>
    </>
  );
}
function Card({
  list,
  open,
  remove,
}: {
  list: ListDoc;
  open: () => void;
  remove?: () => void;
}) {
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, "lists", list.id, "tasks"), (s) =>
      setTasks(s.docs.map((x) => ({ id: x.id, ...x.data() }) as TaskDoc)),
    );
  }, [list.id]);
  const done = tasks.filter((x) => x.status === "completed").length;
  return (
    <article className="list-card">
      <div className="list-card-header">
        <span>📋</span>
        <button type="button" className="list-card-title" onClick={open}>
          {list.title}
        </button>
        {remove && (
          <button
            type="button"
            className="list-card-delete"
            aria-label={`Delete ${list.title}`}
            onClick={remove}
          >
            <Trash2 />
          </button>
        )}
      </div>
      <button type="button" className="list-card-open" onClick={open}>
        <p>{list.description || "No description"}</p>
        <div className="progress">
          <i
            style={{
              width: (tasks.length ? (done / tasks.length) * 100 : 0) + "%",
              background: "#18ba79",
            }}
          />
        </div>
        <small>
          {done} of {tasks.length} tasks completed
        </small>
        <footer>
          {shared(list) ? (
            <span className="avatar-stack">
              <Avatar n="Owner" small />
              <Avatar n="Member" small />
            </span>
          ) : (
            <span />
          )}
          <em>{shared(list) ? "Shared" : "Private"}</em>
        </footer>
      </button>
    </article>
  );
}
function Dashboard({
  user,
  section,
  openList,
  create,
  deleteList,
}: {
  user: User;
  section: "mine" | "shared";
  openList: (x: string) => void;
  create: () => void;
  deleteList: (list: ListDoc) => void;
}) {
  const [lists, setLists] = useState<ListDoc[]>([]),
    [text, setText] = useState("");
  useEffect(() => {
    if (!db) return;
    const source =
      section === "mine"
        ? query(collection(db, "lists"), where("ownerId", "==", user.uid))
        : query(
            collection(db, "lists"),
            where("memberIds", "array-contains", user.uid),
          );
    return onSnapshot(source, (s) =>
      setLists(
        s.docs
          .map((x) => ({ id: x.id, ...x.data() }) as ListDoc)
          .filter((x) => section === "mine" || x.ownerId !== user.uid),
      ),
    );
  }, [section, user.uid]);
  const shown = useMemo(
    () =>
      lists.filter((x) => x.title.toLowerCase().includes(text.toLowerCase())),
    [lists, text],
  );
  const mine = section === "mine";
  return (
    <section className="page">
      <div className="title">
        <div>
          <h1>{mine ? "My Todo Lists" : "Shared with me"}</h1>
          <p>
            {mine
              ? "Keep everything organized in one place."
              : "Lists others have shared with you."}
          </p>
        </div>
        <div className="dashboard-actions">
          <label className="dashboard-search">
            <Search />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search lists..."
            />
          </label>
          <div className="tools">
            {mine && (
              <Btn onClick={create}>
                <Plus />
                Create New List
              </Btn>
            )}
          </div>
        </div>
      </div>
      {shown.length ? (
        <div className="cards">
          {shown.map((x) => (
            <Card
              key={x.id}
              list={x}
              open={() => openList(x.id)}
              remove={x.ownerId === user.uid ? () => deleteList(x) : undefined}
            />
          ))}
        </div>
      ) : (
        <section className="state">
          <div>
            <Search />
          </div>
          <h2>{mine ? "No lists yet" : "No shared lists yet"}</h2>
          <p>
            {mine
              ? "Create your first list to get started."
              : "Lists shared with you will appear here."}
          </p>
          {mine && <Btn onClick={create}>Create New List</Btn>}
        </section>
      )}
    </section>
  );
}
function Row({
  task,
  listId,
  editable,
  user,
  open,
}: {
  task: TaskDoc;
  listId: string;
  editable: boolean;
  user: User;
  open: (m: Modal, t?: TaskDoc) => void;
}) {
  async function toggle() {
    if (db && editable) {
      const nextStatus: Status =
        task.status === "completed" ? "pending" : "completed";
      await commitTaskActivity({
        listId,
        taskRef: doc(db, "lists", listId, "tasks", task.id),
        operation: "update",
        taskData: {
          status: nextStatus,
          lastModifiedById: user.uid,
          lastModifiedByName: name(user),
          updatedAt: serverTimestamp(),
        },
        activity: {
          taskId: task.id,
          taskTitle: task.title,
          action: nextStatus === "completed" ? "completed" : "reopened",
          actorId: user.uid,
          actorName: name(user),
          changes: [
            {
              field: "Status",
              before: task.status === "completed" ? "Completed" : "Pending",
              after: nextStatus === "completed" ? "Completed" : "Pending",
            },
          ],
        },
      });
    }
  }
  return (
    <div className={"row " + (task.status === "completed" ? "done" : "")}>
      <button
        disabled={!editable}
        className="check"
        onClick={toggle}
        aria-label={
          task.status === "completed"
            ? "Mark task incomplete"
            : "Mark task complete"
        }
      >
        {task.status === "completed" && <Check />}
      </button>
      <button className="task-title" onClick={() => open("details", task)}>
        <span>{task.title}</span>
        <small>
          Added by {task.createdByName || "Unknown member"} · Last updated by{" "}
          {task.lastModifiedByName || task.createdByName || "Unknown member"}
        </small>
      </button>
      <span className="task-priority" data-label="Priority">
        {task.priority}
      </span>
      <span className="task-date" data-label="Due date">
        {date(task.dueDate)}
      </span>
      {editable ? (
        <div className="task-actions" aria-label={`Actions for ${task.title}`}>
          <button
            className="task-menu"
            aria-label={`Edit ${task.title}`}
            onClick={() => open("editTask", task)}
          >
            <Pencil />
          </button>
          <button
            className="task-menu task-delete"
            aria-label={`Delete ${task.title}`}
            onClick={() => open("deleteTask", task)}
          >
            <Trash2 />
          </button>
        </div>
      ) : (
        <span />
      )}
    </div>
  );
}
function TaskActivityFeed({ listId, taskId }: { listId: string; taskId: string }) {
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      query(
        collection(db, "lists", listId, "auditEvents"),
        where("taskId", "==", taskId),
      ),
      (snapshot) =>
        setActivities(
          snapshot.docs
            .map((item) => ({ id: item.id, ...item.data() }) as TaskActivity)
            .sort(
              (a, b) =>
                timestampValue(b.occurredAt) - timestampValue(a.occurredAt),
            ),
        ),
    );
  }, [listId, taskId]);
  return (
    <section className="task-activity" aria-label="Task activity">
      <h3>Activity</h3>
      {activities.length ? (
        <ol>
          {activities.map((activity) => (
            <li key={activity.id}>
              <p>{activityDescription(activity)}</p>
              {activity.changes?.map((change) => (
                <small key={change.field}>
                  {change.field}: {change.before} → {change.after}
                </small>
              ))}
              <time>{dateTime(activity.occurredAt)}</time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="activity-empty">No activity recorded yet.</p>
      )}
    </section>
  );
}
function TaskActivityModal({
  listId,
  taskId,
  close,
}: {
  listId: string;
  taskId: string;
  close: () => void;
}) {
  return (
    <div className="backdrop task-activity-backdrop" role="presentation">
      <section
        className="modal activity-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-activity-title"
      >
        <header>
          <h2 id="task-activity-title">Task Activity</h2>
          <button type="button" onClick={close} aria-label="Close task activity">
            <X />
          </button>
        </header>
        <TaskActivityFeed listId={listId} taskId={taskId} />
      </section>
    </div>
  );
}
function Members({
  list,
  user,
  owner,
}: {
  list: ListDoc;
  user: User;
  owner: boolean;
}) {
  const [all, setAll] = useState<Member[]>([]),
    [search, setSearch] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (!db) return;
    const firestore = db!;
    let live = true;
    async function load() {
      const ids = [...new Set([list.ownerId, ...(list.memberIds || [])])];
      const rows = await Promise.all(
        ids.map(async (uid) => {
          const p = (await getDoc(doc(firestore, "users", uid))).data() || {};
          return {
            uid,
            email: p.email || (uid === user.uid ? user.email || "" : ""),
            displayName:
              p.displayName || (uid === user.uid ? name(user) : "Trac member"),
            photoURL: p.photoURL,
            role: uid === list.ownerId ? "Owner" : "Member",
            access:
              uid === list.ownerId
                ? "owner"
                : list.memberAccess?.[uid] || "read",
          } as Member;
        }),
      );
      if (live) setAll(rows);
    }
    void load().catch(() => setError("Unable to load member profiles."));
    return () => {
      live = false;
    };
  }, [list, user]);
  const rows = all.filter((x) =>
    (x.displayName + " " + x.email)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  async function change(m: Member, a: MemberAccess) {
    if (!db) return;
    try {
      await updateMemberAccess(db, list.id, m.uid, a);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove(m: Member) {
    if (!db || !confirm(`Remove ${m.displayName} from this list?`)) return;
    try {
      await removeMember(db, list.id, m.uid);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="members-view">
      <label className="task-search member-search">
        <Search />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="member-table">
        <div className="member-head">
          <span>Member</span>
          <span>Email</span>
          <span>Role</span>
          <span>Access type</span>
          <span />
        </div>
        {rows.map((m) => (
          <div className="member-row" key={m.uid}>
            <span className="member-person" data-label="Member">
              <Avatar n={m.displayName} url={m.photoURL} />
              <b>{m.displayName}</b>
            </span>
            <span data-label="Email">{m.email}</span>
            <span data-label="Role">{m.role}</span>
            {m.role === "Owner" ? (
              <span data-label="Access">All access</span>
            ) : owner ? (
              <select
                value={m.access}
                onChange={(e) => void change(m, e.target.value as MemberAccess)}
              >
                <option value="edit">Can Edit</option>
                <option value="read">Read Only</option>
              </select>
            ) : (
              <span data-label="Access">
                {m.access === "edit" ? "Can Edit" : "Read Only"}
              </span>
            )}
            {m.role === "Member" && owner ? (
              <button className="remove-member" onClick={() => void remove(m)}>
                Remove
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
function ListView({
  id,
  user,
  back,
  open,
}: {
  id: string;
  user: User;
  back: () => void;
  open: (m: Modal, t?: TaskDoc, selectedList?: ListDoc) => void;
}) {
  const [list, setList] = useState<ListDoc | null>(null),
    [tasks, setTasks] = useState<TaskDoc[]>([]),
    [tab, setTab] = useState<"tasks" | "members">("tasks"),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState<"all" | Status>("all"),
    [sort, setSort] = useState<TaskSort>("createdDesc"),
    [sortOpen, setSortOpen] = useState(false),
    [newTask, setNewTask] = useState(""),
    [newPriority, setNewPriority] = useState<Priority | "">(""),
    [newDue, setNewDue] = useState("");
  useEffect(() => {
    if (!db) return;
    const a = onSnapshot(doc(db, "lists", id), (s) =>
      setList(s.exists() ? ({ id: s.id, ...s.data() } as ListDoc) : null),
    );
    const b = onSnapshot(collection(db, "lists", id, "tasks"), (s) =>
      setTasks(s.docs.map((x) => ({ id: x.id, ...x.data() }) as TaskDoc)),
    );
    return () => {
      a();
      b();
    };
  }, [id]);
  const shown = useMemo(
    () =>
      tasks
        .filter(
          (x) =>
            (filter === "all" || x.status === filter) &&
            x.title.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) => {
          if (sort === "createdAsc")
            return timestampValue(a.createdAt) - timestampValue(b.createdAt);
          if (sort === "updatedDesc")
            return timestampValue(b.updatedAt) - timestampValue(a.updatedAt);
          if (sort === "priorityDesc")
            return priorityValue(b.priority) - priorityValue(a.priority);
          if (sort === "dueAsc") {
            const aDue = timestampValue(a.dueDate);
            const bDue = timestampValue(b.dueDate);
            if (!aDue && !bDue) return 0;
            if (!aDue) return 1;
            if (!bDue) return -1;
            return aDue - bDue;
          }
          return timestampValue(b.createdAt) - timestampValue(a.createdAt);
        }),
    [filter, search, sort, tasks],
  );
  if (!list)
    return (
      <section className="state">
        <h2>Loading list…</h2>
      </section>
    );
  const owner = list.ownerId === user.uid,
    editable = owner || list.memberAccess?.[user.uid] === "edit",
    done = tasks.filter((x) => x.status === "completed").length;
  async function add() {
    if (db && editable && newTask.trim()) {
      const taskRef = doc(collection(db, "lists", id, "tasks"));
      await commitTaskActivity({
        listId: id,
        taskRef,
        operation: "set",
        taskData: {
        title: newTask.trim(),
        description: "",
        status: "pending",
        priority: newPriority || "medium",
        dueDate: newDue
          ? Timestamp.fromDate(new Date(`${newDue}T12:00:00`))
          : null,
        assigneeId: user.uid,
        createdById: user.uid,
        createdByName: name(user),
        lastModifiedById: user.uid,
        lastModifiedByName: name(user),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        },
        activity: {
          taskId: taskRef.id,
          taskTitle: newTask.trim(),
          action: "created",
          actorId: user.uid,
          actorName: name(user),
          changes: [],
        },
      });
      setNewTask("");
      setNewPriority("");
      setNewDue("");
    }
  }
  return (
    <section className="page list-page">
      <div className="list-title">
        <Btn kind="ghost" onClick={back}>
          <ArrowLeft />
        </Btn>
        <span>📋</span>
        <div>
          <h1>
            {list.title} <em>{shared(list) ? "Shared" : "Private"}</em>
          </h1>
          <p>{list.description}</p>
        </div>
        <div className="list-actions">
          {owner && (
            <>
              <button
                title="List settings"
                onClick={() => open("settings", undefined, list)}
              >
                <Cog />
              </button>
              <button
                title="Delete list"
                onClick={() => open("deleteList", undefined, list)}
              >
                <Trash2 />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="list-tabs">
        <button
          className={tab === "tasks" ? "on" : ""}
          onClick={() => setTab("tasks")}
        >
          Tasks
        </button>
        <button
          className={tab === "members" ? "on" : ""}
          onClick={() => setTab("members")}
        >
          Members
        </button>
      </div>
      {tab === "members" ? (
        <Members list={list} user={user} owner={owner} />
      ) : (
        <>
          <div className="summary">
            <div>
              <b>
                {done} of {tasks.length} tasks completed
              </b>
              <div className="progress wide">
                <i
                  style={{
                    width:
                      (tasks.length ? (done / tasks.length) * 100 : 0) + "%",
                  }}
                />
              </div>
            </div>
            <div className="task-toolbar">
              <label className="task-search">
                <Search />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tasks..."
                />
              </label>
              <div className="sort-menu">
                <button
                  type="button"
                  className="sort-toggle"
                  aria-label="Sort tasks"
                  aria-expanded={sortOpen}
                  onClick={() => setSortOpen((open) => !open)}
                >
                  <ArrowDownUp />
                </button>
                {sortOpen && (
                  <div className="sort-options" role="menu">
                    {[
                      ["createdDesc", "Date added: newest"],
                      ["createdAsc", "Date added: oldest"],
                      ["updatedDesc", "Last modified"],
                      ["dueAsc", "Due date"],
                      ["priorityDesc", "Priority: high to low"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="menuitemradio"
                        aria-checked={sort === value}
                        className={sort === value ? "on" : ""}
                        onClick={() => {
                          setSort(value as TaskSort);
                          setSortOpen(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {editable && (
            <div className="add">
              <input
                className="add-title"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add a new task..."
                onKeyDown={(e) => e.key === "Enter" && void add()}
              />
              <label className="add-select">
                <select
                  aria-label="Task priority"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as Priority)}
                >
                  <option value="" disabled>
                    Priority
                  </option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label className="add-date">
                <input
                  className={newDue ? "" : "date-empty"}
                  aria-label="Task due date"
                  type="date"
                  title="Due Date"
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                />
                {!newDue && <span className="date-placeholder">Due Date</span>}
              </label>
              <Btn onClick={() => void add()}>
                <Plus />
                Add
              </Btn>
            </div>
          )}
          <div className="list-filter-actions">
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              All tasks
            </button>
            <button
              className={filter === "pending" ? "active" : ""}
              onClick={() => setFilter("pending")}
            >
              Pending
            </button>
            <button
              className={filter === "completed" ? "active" : ""}
              onClick={() => setFilter("completed")}
            >
              Completed
            </button>
          </div>
          <div className="table">
            <div className="table-head">
              <span />
              <span>Task</span>
              <span>Priority</span>
              <span>Due date</span>
              <span />
            </div>
            {shown.map((x) => (
              <Row
                key={x.id}
                task={x}
                listId={id}
                editable={editable}
                user={user}
                open={open}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
function Dialog({
  mode,
  list,
  task,
  user,
  close,
  home,
}: {
  mode: Modal;
  list: ListDoc | null;
  task: TaskDoc | null;
  user: User;
  close: () => void;
  home: () => void;
}) {
  const [title, setTitle] = useState(task?.title || list?.title || ""),
    [description, setDescription] = useState(list?.description || ""),
    [priority, setPriority] = useState<Priority>(task?.priority || "medium"),
    [due, setDue] = useState(
      task?.dueDate ? task.dueDate.toDate().toISOString().slice(0, 10) : "",
    ),
    [email, setEmail] = useState(""),
    [access, setAccess] = useState<MemberAccess>("edit"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [activityOpen, setActivityOpen] = useState(false);
  if (!mode) return null;
  async function save() {
    if (!db || !title.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "create")
        await addDoc(collection(db, "lists"), {
          ownerId: user.uid,
          title: title.trim(),
          description: description.trim(),
          memberIds: [user.uid],
          memberRoles: { [user.uid]: "owner" },
          memberAccess: {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      if (mode === "settings" && list) {
        const emailToShare = email.trim();
        let memberToShare: { uid: string } | null = null;
        if (emailToShare) {
          memberToShare = await findUserByEmail(db, emailToShare);
          if (!memberToShare) {
            setError(
              "Trac user not found. Ask them to create an account before sharing this list.",
            );
            return;
          }
          if (memberToShare.uid === list.ownerId)
            throw new Error("You already own this list.");
          if ((list.memberIds || []).includes(memberToShare.uid))
            throw new Error("This account already has access to this list.");
        }
        await updateDoc(doc(db, "lists", list.id), {
          title: title.trim(),
          description: description.trim(),
          ...(memberToShare
            ? {
                memberIds: arrayUnion(memberToShare.uid),
                ["memberRoles." + memberToShare.uid]: "member",
                ["memberAccess." + memberToShare.uid]: access,
              }
            : {
                memberIds: list.memberIds || [list.ownerId],
                memberRoles: list.memberRoles || { [list.ownerId]: "owner" },
                memberAccess: list.memberAccess || {},
              }),
          updatedAt: serverTimestamp(),
        });
      }
      if (mode === "editTask" && list && task) {
        const nextTitle = title.trim();
        const nextDue = due ? Timestamp.fromDate(new Date(due)) : null;
        const changes: TaskActivityChange[] = [];
        if (nextTitle !== task.title)
          changes.push({ field: "Title", before: task.title, after: nextTitle });
        if (priority !== task.priority)
          changes.push({
            field: "Priority",
            before: priorityLabel(task.priority),
            after: priorityLabel(priority),
          });
        if (timestampValue(nextDue) !== timestampValue(task.dueDate))
          changes.push({
            field: "Due date",
            before: dueDateValue(task.dueDate),
            after: dueDateValue(nextDue),
          });
        if (changes.length)
          await commitTaskActivity({
            listId: list.id,
            taskRef: doc(db, "lists", list.id, "tasks", task.id),
            operation: "update",
            taskData: {
          title: title.trim(),
          priority,
              dueDate: nextDue,
          lastModifiedById: user.uid,
          lastModifiedByName: name(user),
          updatedAt: serverTimestamp(),
            },
            activity: {
              taskId: task.id,
              taskTitle: nextTitle,
              action: "updated",
              actorId: user.uid,
              actorName: name(user),
              changes,
            },
          });
      }
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!db) return;
    setBusy(true);
    try {
      if (mode === "deleteTask" && list && task)
        await commitTaskActivity({
          listId: list.id,
          taskRef: doc(db, "lists", list.id, "tasks", task.id),
          operation: "delete",
          activity: {
            taskId: task.id,
            taskTitle: task.title,
            action: "deleted",
            actorId: user.uid,
            actorName: name(user),
            changes: [],
          },
        });
      if (mode === "deleteList" && list) {
        const all = await getDocs(collection(db, "lists", list.id, "tasks")),
          batch = writeBatch(db);
        all.docs.forEach((x) => batch.delete(x.ref));
        await batch.commit();
        await deleteDoc(doc(db, "lists", list.id));
        home();
      }
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (mode === "details" && task)
    return (
      <aside className="detail">
        <header>
          <h2>Task Details</h2>
          <button
            onClick={() => {
              setActivityOpen(false);
              close();
            }}
          >
            <X />
          </button>
        </header>
        <div>
          <b>{task.title}</b>
        </div>
        <dl>
          {[
            ["Status", task.status],
            ["Priority", task.priority],
            ["Due date", date(task.dueDate)],
            ["List", list?.title || ""],
            ["Added by", task.createdByName || "Unknown member"],
            ["Added on", dateTime(task.createdAt)],
            [
              "Last modified by",
              task.lastModifiedByName || task.createdByName || "Unknown member",
            ],
            ["Last updated", dateTime(task.updatedAt)],
          ].map((x) => (
            <div key={x[0]}>
              <dt>{x[0]}</dt>
              <dd>{x[1]}</dd>
            </div>
          ))}
        </dl>
        {list && (
          <button
            type="button"
            className="task-activity-trigger"
            onClick={() => setActivityOpen(true)}
          >
            Task Activity
          </button>
        )}
        {list && activityOpen && (
          <TaskActivityModal
            listId={list.id}
            taskId={task.id}
            close={() => setActivityOpen(false)}
          />
        )}
      </aside>
    );
  const del = mode === "deleteList" || mode === "deleteTask";
  return (
    <div className="backdrop">
      <section className="modal">
        <header>
          <h2>
            {mode === "create"
              ? "Create New List"
              : mode === "settings"
                ? "List Settings"
                : del
                  ? "Delete this?"
                  : "Edit Task"}
          </h2>
          <button onClick={close}>
            <X />
          </button>
        </header>
        {del ? (
          <>
            <div className="warning">
              <AlertTriangle />
            </div>
            <p className="center">This action cannot be undone.</p>
            <div className="delete-name">{task?.title || list?.title}</div>
            {error && <p className="form-error">{error}</p>}
            <footer>
              <Btn kind="secondary" onClick={close}>
                Cancel
              </Btn>
              <Btn kind="danger" disabled={busy} onClick={() => void remove()}>
                Delete
              </Btn>
            </footer>
          </>
        ) : (
          <>
            <label className="lab">
              {mode === "editTask" ? "Task title *" : "List name *"}
            </label>
            <Field value={title} set={setTitle} placeholder="Name" />
            {mode !== "editTask" && (
              <>
                <label className="lab">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </>
            )}
            {mode === "editTask" && (
              <div className="split">
                <label className="select">
                  Priority
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label className="select">
                  Due date
                  <input
                    type="date"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                  />
                </label>
              </div>
            )}
            {mode === "settings" && (
              <section className="share-section">
                <h3>Share this list</h3>
                <p>Share with an existing Trac account.</p>
                <div className="invite-input">
                  <Field
                    value={email}
                    set={setEmail}
                    placeholder="Email address"
                  />
                  <select
                    value={access}
                    onChange={(e) => setAccess(e.target.value as MemberAccess)}
                  >
                    <option value="edit">Can Edit</option>
                    <option value="read">Read Only</option>
                  </select>
                </div>
              </section>
            )}
            {error && <p className="form-error">{error}</p>}
            <footer>
              <Btn kind="secondary" onClick={close}>
                Cancel
              </Btn>
              <Btn disabled={busy} onClick={() => void save()}>
                {mode === "create" ? "Add" : "Save changes"}
              </Btn>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
function App() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [section, setSection] = useState<"mine" | "shared">("mine"),
    [view, setView] = useState<"dashboard" | "list">("dashboard"),
    [id, setId] = useState(""),
    [mode, setMode] = useState<Modal>(null),
    [task, setTask] = useState<TaskDoc | null>(null),
    [list, setList] = useState<ListDoc | null>(null);
  useEffect(() => {
    if (!auth) {
      setReady(true);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
      if (u && db)
        void setDoc(
          doc(db, "users", u.uid),
          {
            email: u.email || "",
            emailLower: (u.email || "").toLowerCase(),
            displayName: name(u),
            photoURL: u.photoURL || "",
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
    });
  }, []);
  useEffect(() => {
    if (!db || !id) return;
    return onSnapshot(doc(db, "lists", id), (x) =>
      setList(x.exists() ? ({ id: x.id, ...x.data() } as ListDoc) : null),
    );
  }, [id]);
  if (!ready) return <div className="auth-loading">Loading Trac…</div>;
  if (!user) return <Auth />;
  const home = () => {
    setView("dashboard");
    setMode(null);
    setTask(null);
    setList(null);
  };
  const open = (m: Modal, t?: TaskDoc, selectedList?: ListDoc) => {
    setTask(t || null);
    if (selectedList) setList(selectedList);
    setMode(m);
  };
  const navigate = (nextSection: "mine" | "shared") => {
    setSection(nextSection);
    home();
  };
  return (
    <div className="shell">
      <Side section={section} setSection={navigate} />
      <Top user={user} />
      <main>
        {view === "dashboard" ? (
          <Dashboard
            user={user}
            section={section}
            create={() => open("create")}
            deleteList={(selectedList) => open("deleteList", undefined, selectedList)}
            openList={(x) => {
              setId(x);
              setView("list");
            }}
          />
        ) : (
          <ListView id={id} user={user} back={home} open={open} />
        )}
      </main>
      <Dialog
        key={
          (mode || "closed") + "-" + (task?.id || "") + "-" + (list?.id || "")
        }
        mode={mode}
        list={list}
        task={task}
        user={user}
        close={() => setMode(null)}
        home={home}
      />
      <MobileNav
        section={section}
        setSection={navigate}
        create={() => open("create")}
        canCreate={view === "dashboard" && section === "mine"}
      />
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
