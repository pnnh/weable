"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";

type Props = {
    lang: string;
};

export default function SignInForm({ lang }: Props) {
    const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, null);

    return (
        <form action={formAction} className="space-y-6">
            <input type="hidden" name="lang" value={lang} />
            {state?.error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                    {state.error}
                </div>
            )}
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    邮箱（必填）
                </label>
                <input
                    id="email"
                    name="email"
                    type="text"
                    autoComplete="email"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="dev@example.com"
                />
            </div>
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    用户名称（可选）
                </label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Dev User"
                />
            </div>
            <button
                type="submit"
                disabled={pending}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
                {pending ? "登录中…" : "登录"}
            </button>
        </form>
    );
}
