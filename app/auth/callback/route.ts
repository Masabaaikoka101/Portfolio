import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get("next") ?? "/";

    if (code) {
        const cookieStore = new Map<string, { value: string; options: any }>();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, { value, options });
                        });
                    },
                },
            }
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === "development";

            // リダイレクト先を作成
            // 開発環境では origin を使用、本番等では forwardedHost を考慮
            let redirectUrl = `${origin}${next}`;
            if (!isLocalEnv && forwardedHost) {
                redirectUrl = `https://${forwardedHost}${next}`;
            }

            const response = NextResponse.redirect(redirectUrl);

            // ストアされたCookieをレスポンスに適用
            cookieStore.forEach(({ value, options }, name) => {
                response.cookies.set(name, value, options);
            });

            return response;
        } else {
            console.error("Auth exchange error:", error);
        }
    }

    // エラー時のリダイレクト先（今回はシンプルにトップへ戻すか、エラーページへ）
    // ユーザー体験のために一旦トップへ戻すが、本来はエラー表示すべき
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
