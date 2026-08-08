"use client";

type Props = {
  lang: string;
};

export default function CalieoSignInButton({ lang }: Props) {
  return (
    <a
      href={`/api/auth/signin/calieo?lang=${lang}`}
      className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
    >
      使用 Calieo 登录
    </a>
  );
}
