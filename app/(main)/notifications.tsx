import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { colors } from "../../constants/color";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { router } from "expo-router";
import { markNotificationAsRead, deleteNotification } from "../../lib/notifications";
import { EmptyState } from "../../components/ui/empty-state";
import { SkeletonActivityCard } from "../../components/ui/skeleton";

type Notification = {
  id: string;
  type: "participation" | "comment" | "reminder";
  title: string;
  message: string;
  activityId?: string;
  activityTitle?: string;
  fromUserId?: string;
  fromUserName?: string;
  read: boolean;
  createdAt: any;
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Notification[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type,
          title: data.title,
          message: data.message,
          activityId: data.activityId,
          activityTitle: data.activityTitle,
          fromUserId: data.fromUserId,
          fromUserName: data.fromUserName,
          read: data.read || false,
          createdAt: data.createdAt,
        };
      });
      setNotifications(list);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleNotificationPress = async (notif: Notification) => {
    // marquer comme lue
    if (!notif.read && user) {
      await markNotificationAsRead(user.uid, notif.id);
    }

    // naviguer vers l'activite
    if (notif.activityId) {
      router.push(`/(main)/activity-details?id=${notif.activityId}` as any);
    }
  };

  const handleDelete = async (notif: Notification) => {
    if (user) {
      await deleteNotification(user.uid, notif.id);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "participation":
        return "person-add";
      case "comment":
        return "chatbubble";
      case "reminder":
        return "alarm";
      default:
        return "notifications";
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const isUnread = !item.read;
    const date = item.createdAt?.toDate
      ? format(item.createdAt.toDate(), "dd MMM à HH:mm", { locale: fr })
      : "";

    return (
      <TouchableOpacity
        style={[s.notifCard, isUnread && s.notifCardUnread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={s.notifIcon}>
          <Ionicons
            name={getIcon(item.type) as any}
            size={24}
            color={isUnread ? colors.primary : colors.muted}
          />
        </View>

        <View style={s.notifContent}>
          <Text style={[s.notifTitle, isUnread && s.notifTitleUnread]}>
            {item.title}
          </Text>
          <Text style={s.notifMessage}>{item.message}</Text>
          {item.activityTitle && (
            <Text style={s.notifActivity}>📍 {item.activityTitle}</Text>
          )}
          {date && <Text style={s.notifDate}>{date}</Text>}
        </View>

        <TouchableOpacity
          style={s.deleteBtn}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="close" size={20} color={colors.muted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={{ padding: 20 }}>
          <SkeletonActivityCard />
          <SkeletonActivityCard />
          <SkeletonActivityCard />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState 
          icon="notifications-off-outline" 
          title="Aucune notification" 
          description="Tu seras notifié quand quelqu'un interagit avec tes activités"
        />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#020617",
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },
  headerTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    flex: 1,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    color: "#0b111f",
    fontSize: 12,
    fontWeight: "700",
  },
  list: {
    padding: 20,
  },
  notifCard: {
    flexDirection: "row",
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#111827",
  },
  notifCardUnread: {
    borderColor: colors.primary,
    backgroundColor: "#0f172a",
  },
  notifIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  notifTitleUnread: {
    fontWeight: "700",
  },
  notifMessage: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 4,
  },
  notifActivity: {
    color: colors.primary,
    fontSize: 13,
    marginBottom: 4,
  },
  notifDate: {
    color: colors.muted,
    fontSize: 12,
  },
  deleteBtn: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
});
