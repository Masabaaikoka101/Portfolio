"use client";

import {
    createContext,
    useContext,
    useState,
    useCallback,
    ReactNode,
} from "react";

interface NavigationGuardContextType {
    shouldBlock: boolean;
    message: string;
    setNavigationGuard: (shouldBlock: boolean, message?: string) => void;
    confirmNavigation: () => boolean;
}

const NavigationGuardContext = createContext<NavigationGuardContextType | null>(
    null
);

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
    const [shouldBlock, setShouldBlock] = useState(false);
    const [message, setMessage] = useState(
        "更新せずに編集内容を破棄しますか？"
    );

    const setNavigationGuard = useCallback(
        (block: boolean, msg?: string) => {
            setShouldBlock(block);
            if (msg) setMessage(msg);
        },
        []
    );

    /**
     * ナビゲーションの確認を行う
     * @returns true: 遷移OK, false: 遷移キャンセル
     */
    const confirmNavigation = useCallback(() => {
        if (!shouldBlock) return true;
        const confirmed = window.confirm(message);
        return confirmed;
    }, [shouldBlock, message]);

    return (
        <NavigationGuardContext.Provider
            value={{
                shouldBlock,
                message,
                setNavigationGuard,
                confirmNavigation,
            }}
        >
            {children}
        </NavigationGuardContext.Provider>
    );
}

export function useNavigationGuard() {
    const context = useContext(NavigationGuardContext);
    if (!context) {
        throw new Error(
            "useNavigationGuard must be used within a NavigationGuardProvider"
        );
    }
    return context;
}
