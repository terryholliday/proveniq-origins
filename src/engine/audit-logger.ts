/**
 * PROVENIQ ORIGINS — Audit Logger
 * 
 * Structured event logging for all state transitions.
 * Logs go to server logs / DB table - NEVER shown to user.
 */

import { AuditEvent, AuditEventTypeSchema } from './schemas';
import { v4 as uuidv4 } from 'uuid';

export class AuditLogger {
    private sessionId: string;
    private events: AuditEvent[] = [];

    constructor(sessionId: string) {
        this.sessionId = sessionId;
    }

    /**
     * Log an event
     */
    log(
        type: AuditEvent['type'],
        turnNumber: number,
        actNumber: number,
        payload: Record<string, unknown> = {}
    ): AuditEvent {
        const event: AuditEvent = {
            id: uuidv4(),
            session_id: this.sessionId,
            type,
            timestamp: new Date().toISOString(),
            turn_number: turnNumber,
            act_number: actNumber,
            payload,
        };

        this.events.push(event);

        // Log to console in structured format (would go to DB in production)
        console.log(JSON.stringify({
            level: 'info',
            service: 'origins-audit',
            event: event,
        }));

        return event;
    }

    /**
     * Log session start
     */
    sessionStart(userId: string): void {
        this.log('session_start', 0, 1, { user_id: userId });
    }

    /**
     * Log turn received
     */
    turnReceived(turnNumber: number, actNumber: number, messageLength: number): void {
        this.log('turn_received', turnNumber, actNumber, { message_length: messageLength });
    }

    /**
     * Log pattern detected
     */
    patternDetected(
        turnNumber: number,
        actNumber: number,
        patternKind: string,
        confidence: number
    ): void {
        this.log('pattern_detected', turnNumber, actNumber, {
            pattern_kind: patternKind,
            confidence,
        });
    }

    /**
     * Log pattern disclosed to user
     */
    patternDisclosed(
        turnNumber: number,
        actNumber: number,
        patternKind: string,
        costHint: string | undefined
    ): void {
        this.log('pattern_disclosed', turnNumber, actNumber, {
            pattern_kind: patternKind,
            cost_hint: costHint,
        });
    }

    /**
     * Log move selected
     */
    moveSelected(
        turnNumber: number,
        actNumber: number,
        strategy: string,
        device: string | undefined,
        instruction: string
    ): void {
        this.log('move_selected', turnNumber, actNumber, {
            strategy,
            device,
            instruction,
        });
    }

    /**
     * Log move executed
     */
    moveExecuted(
        turnNumber: number,
        actNumber: number,
        strategy: string,
        responseLength: number
    ): void {
        this.log('move_executed', turnNumber, actNumber, {
            strategy,
            response_length: responseLength,
        });
    }

    /**
     * Log reveal teased
     */
    revealTeased(
        turnNumber: number,
        actNumber: number,
        revealId: string,
        teaseLine: string
    ): void {
        this.log('reveal_teased', turnNumber, actNumber, {
            reveal_id: revealId,
            tease_line: teaseLine,
        });
    }

    /**
     * Log reveal permission asked
     */
    revealPermissionAsked(
        turnNumber: number,
        actNumber: number,
        revealId: string
    ): void {
        this.log('reveal_permission_asked', turnNumber, actNumber, {
            reveal_id: revealId,
        });
    }

    /**
     * Log reveal permission granted
     */
    revealPermissionGranted(
        turnNumber: number,
        actNumber: number,
        revealId: string
    ): void {
        this.log('reveal_permission_granted', turnNumber, actNumber, {
            reveal_id: revealId,
        });
    }

    /**
     * Log reveal permission declined
     */
    revealPermissionDeclined(
        turnNumber: number,
        actNumber: number,
        revealId: string
    ): void {
        this.log('reveal_permission_declined', turnNumber, actNumber, {
            reveal_id: revealId,
        });
    }

    /**
     * Log reveal executed
     */
    revealExecuted(
        turnNumber: number,
        actNumber: number,
        revealId: string,
        receiptType: string
    ): void {
        this.log('reveal_executed', turnNumber, actNumber, {
            reveal_id: revealId,
            receipt_type: receiptType,
        });
    }

    /**
     * Log reveal vetoed by S&P
     */
    revealVetoed(
        turnNumber: number,
        actNumber: number,
        revealId: string,
        reason: string
    ): void {
        this.log('reveal_vetoed', turnNumber, actNumber, {
            reveal_id: revealId,
            reason,
        });
    }

    /**
     * Log safety triggered
     */
    safetyTriggered(
        turnNumber: number,
        actNumber: number,
        signalType: string,
        confidence: number
    ): void {
        this.log('safety_triggered', turnNumber, actNumber, {
            signal_type: signalType,
            confidence,
        });
    }

    /**
     * Log S&P veto of a move
     */
    spVeto(
        turnNumber: number,
        actNumber: number,
        originalMove: string,
        reason: string,
        alternativeMove: string | undefined
    ): void {
        this.log('sp_veto', turnNumber, actNumber, {
            original_move: originalMove,
            reason,
            alternative_move: alternativeMove,
        });
    }

    /**
     * Log commercial break
     */
    commercialBreak(
        turnNumber: number,
        actNumber: number,
        openLoops: string[],
        storyBullets: string[]
    ): void {
        this.log('commercial_break', turnNumber, actNumber, {
            open_loops: openLoops,
            story_bullets: storyBullets,
        });
    }

    /**
     * Log act transition
     */
    actTransition(
        turnNumber: number,
        fromAct: number,
        toAct: number
    ): void {
        this.log('act_transition', turnNumber, toAct, {
            from_act: fromAct,
            to_act: toAct,
        });
    }

    /**
     * Log session end
     */
    sessionEnd(
        turnNumber: number,
        actNumber: number,
        metrics: Record<string, number>
    ): void {
        this.log('session_end', turnNumber, actNumber, { metrics });
    }

    /**
     * Get all events (for testing/debugging)
     */
    getEvents(): AuditEvent[] {
        return [...this.events];
    }

    /**
     * Get events by type
     */
    getEventsByType(type: AuditEvent['type']): AuditEvent[] {
        return this.events.filter(e => e.type === type);
    }
}
