import { LucideIcon } from 'lucide-react';

interface Category {
    value: string;
    icon: LucideIcon;
    label: string;
}

interface Subject {
    value: string;
    icon: LucideIcon;
    label: string;
}

import {
    Utensils,
    ShoppingBag,
    ShoppingBasket,
    Baby,
    Bus,
    Book,
    Donut,
    Tv,
    Gift,
    Users,
    UsersRound,
    Heart,
    DollarSign,
    FileText,
    Home,
    ChartArea,
    Dices,
    Banknote,
    PenLine,
    BriefcaseBusiness,
    Landmark,
    User,
    UserRound,
    UserCheck,
    UserRoundCheck,
    Handshake
} from "lucide-react"


export const categories: Category[] = [
    { value: '🍔 Food & Beverages', icon: Utensils, label: 'Food & Beverages' },
    { value: '🥫 Snacks', icon: Donut, label: 'Snacks' },
    { value: '👼🏼 Baby', icon: Baby, label: 'Baby' },
    { value: '🛒 Groceries', icon: ShoppingBasket, label: 'Groceries' },
    { value: '🚗 Transportation', icon: Bus, label: 'Transportation' },
    { value: '🎓 Education', icon: Book, label: 'Education' },
    { value: '🍿 Entertainment', icon: Tv, label: 'Entertainment' },
    { value: '🎁 Gift & Donations', icon: Gift, label: 'Gift & Donations' },
    { value: '😊 Family', icon: Users, label: 'Family' },
    { value: '💊 Health', icon: Heart, label: 'Health' },
    { value: '🧾 Bill & Utilities', icon: FileText, label: 'Bill & Utilities' },
    { value: '💵 Fees & Charges', icon: DollarSign, label: 'Fees & Charges' },
    { value: '🛍️ Shopping', icon: ShoppingBag, label: 'Shopping' },
    { value: '💰 Investment', icon: ChartArea, label: 'Investment' },
    { value: '🏠 Accommodation', icon: Home, label: 'Accommodation' },
    { value: '🎲 Others', icon: Dices, label: 'Others' },
] as const;

export const categoriesIncome: Category[] = [
    { value: '💰 Salary', icon: Banknote, label: 'Salary' },
    { value: '✍🏼 Event', icon: PenLine, label: 'Event' },
    { value: '💼 Business', icon: BriefcaseBusiness, label: 'Business' },
    { value: '🎁 Gift', icon: Landmark, label: 'Gift' },
    { value: '🎲 Others', icon: Dices, label: 'Others' },
] as const;

export const subjects: Subject[] = [
    { value: 'Al (Personal)', icon: User, label: 'Al (Personal)' },
    { value: 'Nurin (Personal)', icon: UserRound, label: 'Nurin (Personal)' },
    { value: 'Al (Family)', icon: Users, label: 'Al (Family)' },
    { value: 'Nurin (Family)', icon: UsersRound, label: 'Nurin (Family)' },
    { value: 'Al (Lainnya)', icon: UserCheck, label: 'Al (Lainnya)' },
    { value: 'Nurin (Lainnya)', icon: UserRoundCheck, label: 'Nurin (Lainnya)' },
    { value: 'Al & Nurin', icon: Handshake, label: 'Al & Nurin' },
] as const;

export const subjectsIncome: Subject[] = [
    { value: 'Al', icon: User, label: 'Al' },
    { value: 'Nurin', icon: UserRound, label: 'Nurin' },
] as const;