// src/pages/admin/SupportPage.jsx
import { SectionTitle, Card } from "../../components/admin/shared/Card";
import { Th, Td } from "../../components/admin/shared/AdminTable";
import Badge from "../../components/admin/shared/Badge";

const tickets = [
  { id: "#4821", user: "Rahul Verma",  issue: "Refund not processed",  priority: "High",   time: "2h ago" },
  { id: "#4819", user: "Sneha Patel",  issue: "Seat upgrade request",  priority: "Low",    time: "4h ago" },
  { id: "#4815", user: "Amir Khan",    issue: "Baggage claim delayed", priority: "Medium", time: "6h ago" },
  { id: "#4810", user: "Divya Menon",  issue: "Flight rescheduled",    priority: "High",   time: "1d ago" },
];

export default function SupportPage() {
  return (
    <>
      <SectionTitle>Support tickets</SectionTitle>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead><tr><Th>ID</Th><Th>User</Th><Th>Issue</Th><Th>Priority</Th><Th>Raised</Th></tr></thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <Td><span className="font-semibold text-[#1565C0]">{t.id}</span></Td>
                <Td>{t.user}</Td>
                <Td>{t.issue}</Td>
                <Td><Badge label={t.priority} /></Td>
                <Td className="text-[#7A90A4]">{t.time}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}