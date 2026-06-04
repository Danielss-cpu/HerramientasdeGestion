import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email?.trim() || !password) {
            return NextResponse.json(
                { error: "Email y contraseña son requeridos" },
                { status: 400 },
            );
        }

        // Find user by email
        const member = await prisma.teamMember.findUnique({
            where: { email: email.trim().toLowerCase() },
        });

        if (!member || member.status !== "active") {
            logger.warn("Auth", `Failed login attempt for unknown or inactive email: ${email}`);
            return NextResponse.json(
                { error: "Credenciales inválidas" },
                { status: 401 },
            );
        }

        // Compare password
        const valid = await bcrypt.compare(password, member.password);
        if (!valid) {
            logger.warn("Auth", `Failed login attempt for user: ${email} - Invalid password`);
            return NextResponse.json(
                { error: "Credenciales inválidas" },
                { status: 401 },
            );
        }

        // Update last login
        await prisma.teamMember.update({
            where: { id: member.id },
            data: { lastLogin: new Date() },
        });

        const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown IP";
        logger.info("Auth", `User '${email}' logged in successfully from IP ${ip}`);

        // Return user data without password
        return NextResponse.json({
            id: member.id,
            name: member.name,
            email: member.email,
            avatar: member.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
            roles: member.roles,
            defaultRole: member.defaultRole,
            specialty: member.specialty,
        });
    } catch (error) {
        logger.error("Auth", `Internal server error during login: ${error instanceof Error ? error.message : "Unknown error"}`);
        console.error("[POST /api/auth/login]", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 },
        );
    }
}
