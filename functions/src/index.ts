import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Expo, ExpoPushMessage } from "expo-server-sdk";

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

// helper pour envoyer une notification expo push
async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: any
) {
  const messages: ExpoPushMessage[] = [];
  
  for (const token of tokens) {
    if (!Expo.isExpoPushToken(token)) {
      console.error(`token invalide: ${token}`);
      continue;
    }
    
    messages.push({
      to: token,
      sound: "default",
      title,
      body,
      data: data || {},
    });
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("erreur lors de l envoi:", error);
    }
  }

  return tickets;
}

// helper pour creer une notif in app
async function createInAppNotification(
  userId: string,
  type: "participation" | "comment" | "reminder",
  title: string,
  message: string,
  activityId?: string,
  activityTitle?: string,
  fromUserId?: string,
  fromUserName?: string
) {
  const ref = db.collection("users").doc(userId).collection("notifications").doc();
  await ref.set({
    type,
    title,
    message,
    activityId: activityId || null,
    activityTitle: activityTitle || null,
    fromUserId: fromUserId || null,
    fromUserName: fromUserName || null,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// fonction pour nettoyer les tokens invalides (pas encore utilisee mais prete pour le futur)
// async function removeInvalidTokens(userId: string, invalidTokens: string[]) {
//   const batch = db.batch();
//   for (const token of invalidTokens) {
//     const ref = db.collection("users").doc(userId).collection("pushTokens").doc(token);
//     batch.delete(ref);
//   }
//   await batch.commit();
// }

// 1 quand quelqu un participe a une activite
export const onParticipationAdded = functions.firestore
  .document("activities/{activityId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const activityId = context.params.activityId;

    // recuperer les nouveaux participants
    const beforeParticipants: string[] = before.participants || [];
    const afterParticipants: string[] = after.participants || [];
    const newParticipants = afterParticipants.filter(
      (p) => !beforeParticipants.includes(p)
    );

    if (newParticipants.length === 0) return null;

    const ownerId = after.ownerId;
    const activityTitle = after.title;

    // pour chaque nouveau participant
    for (const participantId of newParticipants) {
      // ne pas notifier le createur si c est lui qui participe
      if (participantId === ownerId) continue;

      // recuperer le nom du participant
      const participantDoc = await db.collection("users").doc(participantId).get();
      const participantName = participantDoc.data()?.displayName || "Quelqu un";

      // recuperer les tokens du createur
      const tokensSnap = await db
        .collection("users")
        .doc(ownerId)
        .collection("pushTokens")
        .get();
      const tokens = tokensSnap.docs.map((d) => d.id);

      if (tokens.length > 0) {
        const title = "Nouvelle participation";
        const body = `${participantName} participe a ${activityTitle}`;

        // envoyer push notif
        await sendPushNotification(tokens, title, body, {
          activityId,
          type: "participation",
        });
      }

      // creer notif in app
      await createInAppNotification(
        ownerId,
        "participation",
        "Nouvelle participation",
        `${participantName} participe a ton activite`,
        activityId,
        activityTitle,
        participantId,
        participantName
      );
    }

    return null;
  });

// 2 quand quelqu un commente une activite
export const onCommentAdded = functions.firestore
  .document("activities/{activityId}/comments/{commentId}")
  .onCreate(async (snap, context) => {
    const comment = snap.data();
    const activityId = context.params.activityId;
    const commentAuthorId = comment.userId;
    const commentAuthorName = comment.userName || "Quelqu un";
    const commentText = comment.text;

    // recuperer l activite
    const activityDoc = await db.collection("activities").doc(activityId).get();
    if (!activityDoc.exists) return null;

    const activity = activityDoc.data()!;
    const ownerId = activity.ownerId;
    const activityTitle = activity.title;

    // notifier le createur seulement si ce n est pas lui qui commente
    if (commentAuthorId !== ownerId) {
      // recuperer les tokens du createur
      const tokensSnap = await db
        .collection("users")
        .doc(ownerId)
        .collection("pushTokens")
        .get();
      const tokens = tokensSnap.docs.map((d) => d.id);

      if (tokens.length > 0) {
        const title = "Nouveau commentaire";
        const body = `${commentAuthorName}: ${commentText.substring(0, 50)}${
          commentText.length > 50 ? "..." : ""
        }`;

        await sendPushNotification(tokens, title, body, {
          activityId,
          type: "comment",
        });
      }

      // creer notif in app
      await createInAppNotification(
        ownerId,
        "comment",
        "Nouveau commentaire",
        `${commentAuthorName} a commente: ${commentText.substring(0, 80)}${
          commentText.length > 80 ? "..." : ""
        }`,
        activityId,
        activityTitle,
        commentAuthorId,
        commentAuthorName
      );
    }

    return null;
  });

// 3 rappels avant l activite
// fonction planifiee toutes les 15 minutes
export const sendActivityReminders = functions.pubsub
  .schedule("every 15 minutes")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const in24h = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 24 * 60 * 60 * 1000
    );
    const in1h = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 60 * 60 * 1000
    );

    // activites dans les prochaines 24h
    const activities24h = await db
      .collection("activities")
      .where("date", ">=", now)
      .where("date", "<=", in24h)
      .get();

    for (const activityDoc of activities24h.docs) {
      const activity = activityDoc.data();
      const activityId = activityDoc.id;
      const participants: string[] = activity.participants || [];
      const activityTitle = activity.title;

      // verifier si on a deja envoye le rappel 24h
      const reminder24hSent = activity.reminder24hSent || false;
      if (!reminder24hSent) {
        // envoyer aux participants
        for (const userId of participants) {
          const tokensSnap = await db
            .collection("users")
            .doc(userId)
            .collection("pushTokens")
            .get();
          const tokens = tokensSnap.docs.map((d) => d.id);

          if (tokens.length > 0) {
            await sendPushNotification(
              tokens,
              "Rappel d activite",
              `${activityTitle} commence demain`,
              { activityId, type: "reminder" }
            );
          }

          await createInAppNotification(
            userId,
            "reminder",
            "Rappel d activite",
            `${activityTitle} commence demain`,
            activityId,
            activityTitle
          );
        }

        // marquer comme envoye
        await activityDoc.ref.update({ reminder24hSent: true });
      }
    }

    // activites dans la prochaine heure
    const activities1h = await db
      .collection("activities")
      .where("date", ">=", now)
      .where("date", "<=", in1h)
      .get();

    for (const activityDoc of activities1h.docs) {
      const activity = activityDoc.data();
      const activityId = activityDoc.id;
      const participants: string[] = activity.participants || [];
      const activityTitle = activity.title;

      // verifier si on a deja envoye le rappel 1h
      const reminder1hSent = activity.reminder1hSent || false;
      if (!reminder1hSent) {
        // envoyer aux participants
        for (const userId of participants) {
          const tokensSnap = await db
            .collection("users")
            .doc(userId)
            .collection("pushTokens")
            .get();
          const tokens = tokensSnap.docs.map((d) => d.id);

          if (tokens.length > 0) {
            await sendPushNotification(
              tokens,
              "Rappel d activite",
              `${activityTitle} commence dans 1h`,
              { activityId, type: "reminder" }
            );
          }

          await createInAppNotification(
            userId,
            "reminder",
            "Rappel d activite",
            `${activityTitle} commence dans 1h`,
            activityId,
            activityTitle
          );
        }

        // marquer comme envoye
        await activityDoc.ref.update({ reminder1hSent: true });
      }
    }

    return null;
  });
