export type TaskStatus = 'Pending' | 'Done'
export type Priority = 'Low' | 'Medium' | 'High'
export type Task = { id: number; title: string; done: boolean; due: string; addedBy: string; assignee: string; priority: Priority; description: string }
export type List = { id: string; icon: string; title: string; subtitle: string; total: number; complete: number; shared?: boolean; color: string }

export const people: Record<string, { name: string; initials: string; color: string; email: string }> = {
  jd: { name: 'John Doe', initials: 'JD', color: '#dcd4ff', email: 'john@example.com' },
  sk: { name: 'Sarah Kim', initials: 'SK', color: '#ffd6d7', email: 'sarah@example.com' },
  mk: { name: 'Mike Chen', initials: 'MK', color: '#d4e7ff', email: 'mike@example.com' },
  ps: { name: 'Priya Sharma', initials: 'PS', color: '#daf1bf', email: 'priya@example.com' },
}

export const lists: List[] = [
  { id:'thailand',icon:'✈️',title:'Thailand Trip',subtitle:'Trip planning and bookings',total:8,complete:3,shared:true,color:'#4c3bf2' },
  { id:'grocery',icon:'🛒',title:'Grocery Shopping',subtitle:'Weekly essentials',total:12,complete:5,color:'#15b894' },
  { id:'work',icon:'💼',title:'Work Tasks',subtitle:'Project and meeting tasks',total:10,complete:4,color:'#f58a2a' },
  { id:'home',icon:'🏠',title:'Home Improvement',subtitle:'Renovation and DIY',total:7,complete:2,color:'#ee7586' },
  { id:'fitness',icon:'💗',title:'Fitness Goals',subtitle:'Health and wellness',total:10,complete:6,shared:true,color:'#ed5b98' },
  { id:'reading',icon:'📚',title:'Reading List',subtitle:'Books to read',total:5,complete:1,color:'#31b7c0' },
]

export const initialTasks: Task[] = [
  {id:1,title:'Book airplane tickets',done:true,due:'Apr 10',addedBy:'jd',assignee:'jd',priority:'High',description:'Compare direct flights and confirm the best dates.'},
  {id:2,title:'Book hotels',done:true,due:'Apr 15',addedBy:'sk',assignee:'sk',priority:'Medium',description:'Reserve stays in Bangkok and Chiang Mai.'},
  {id:3,title:'Book cab from home to airport',done:true,due:'Apr 20',addedBy:'mk',assignee:'mk',priority:'Medium',description:'Arrange a reliable cab service for airport pickup. Check availability and confirm the booking.'},
  {id:4,title:'Apply for travel visa',done:false,due:'Apr 25',addedBy:'jd',assignee:'jd',priority:'High',description:'Complete the online visa application.'},
  {id:5,title:'Get travel insurance',done:false,due:'Apr 25',addedBy:'sk',assignee:'sk',priority:'Medium',description:'Choose comprehensive travel insurance.'},
  {id:6,title:'Plan daily itinerary',done:false,due:'Apr 28',addedBy:'mk',assignee:'mk',priority:'Low',description:'Create a flexible day-by-day trip plan.'},
  {id:7,title:'Exchange currency',done:false,due:'Apr 30',addedBy:'ps',assignee:'ps',priority:'Low',description:'Order Thai baht before departure.'},
  {id:8,title:'Pack luggage',done:false,due:'May 5',addedBy:'sk',assignee:'sk',priority:'Medium',description:'Pack essentials and travel documents.'},
]
