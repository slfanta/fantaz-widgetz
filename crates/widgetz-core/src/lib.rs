//! Neutral result queue. No GUI, downloader, OS notification or async dependency.
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

pub const MAX_PENDING: usize = 64;
const SEEN: usize = 128;
const DELIVERY_MS: u64 = 10_000;
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Outcome {
    Success,
    Failure,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DownloadResult {
    pub id: String,
    pub outcome: Outcome,
    pub title: String,
    pub detail: String,
    pub app_name: String,
}
impl DownloadResult {
    pub fn validate(&self) -> Result<(), String> {
        for (name, text, max) in [
            ("id", &self.id, 128),
            ("title", &self.title, 512),
            ("detail", &self.detail, 2048),
            ("appName", &self.app_name, 128),
        ] {
            if text.len() > max
                || (name != "detail" && text.trim().is_empty())
                || text.contains('\0')
            {
                return Err(format!("Invalid notification {name}"));
            }
        }
        Ok(())
    }
    pub fn lifetime_ms(&self) -> u64 {
        match self.outcome {
            Outcome::Success => 8_000,
            Outcome::Failure => 12_000,
        }
    }
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Frame {
    pub notice: DownloadResult,
    pub shown: bool,
    pub held: bool,
    pub remaining_ms: u64,
    pub pending: usize,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Accepted {
    Queued,
    Duplicate,
}
struct Active {
    notice: DownloadResult,
    shown: bool,
    held: bool,
    remaining: u64,
    deadline: u64,
}
#[derive(Default)]
pub struct Queue {
    pending: VecDeque<DownloadResult>,
    current: Option<Active>,
    seen: VecDeque<String>,
}
impl Queue {
    pub fn enqueue(&mut self, notice: DownloadResult) -> Result<Accepted, String> {
        notice.validate()?;
        if self.seen.contains(&notice.id)
            || self
                .current
                .as_ref()
                .is_some_and(|a| a.notice.id == notice.id)
            || self.pending.iter().any(|n| n.id == notice.id)
        {
            return Ok(Accepted::Duplicate);
        }
        if self.pending.len() >= MAX_PENDING {
            return Err(
                "Notification queue is full; producer must retry or retain the result".into(),
            );
        }
        self.seen.push_back(notice.id.clone());
        if self.seen.len() > SEEN {
            self.seen.pop_front();
        }
        self.pending.push_back(notice);
        Ok(Accepted::Queued)
    }
    /// Advance only on producer/reader actions or the next exact expiry deadline.
    /// Returns an undelivered ID for host diagnostics, not a download failure.
    pub fn advance(&mut self, now: u64) -> Option<String> {
        let expired = self
            .current
            .as_ref()
            .is_some_and(|a| (!a.shown || !a.held) && now >= a.deadline);
        let failed = if expired {
            self.current
                .take()
                .filter(|a| !a.shown)
                .map(|a| a.notice.id)
        } else {
            None
        };
        if self.current.is_none()
            && let Some(notice) = self.pending.pop_front()
        {
            let remaining = notice.lifetime_ms();
            self.current = Some(Active {
                notice,
                shown: false,
                held: false,
                remaining,
                deadline: now.saturating_add(DELIVERY_MS),
            });
        }
        failed
    }
    pub fn frame(&self, now: u64) -> Option<Frame> {
        self.current.as_ref().map(|a| Frame {
            notice: a.notice.clone(),
            shown: a.shown,
            held: a.held,
            remaining_ms: if !a.shown || a.held {
                a.remaining
            } else {
                a.deadline.saturating_sub(now)
            },
            pending: self.pending.len(),
        })
    }
    pub fn is_current(&self, id: &str) -> bool {
        self.current.as_ref().is_some_and(|a| a.notice.id == id)
    }
    pub fn acknowledge(&mut self, id: &str, now: u64) -> bool {
        let Some(a) = self.current.as_mut().filter(|a| a.notice.id == id) else {
            return false;
        };
        if !a.shown {
            a.shown = true;
            a.deadline = now.saturating_add(a.remaining);
        }
        true
    }
    pub fn hold(&mut self, id: &str, held: bool, now: u64) -> bool {
        let Some(a) = self
            .current
            .as_mut()
            .filter(|a| a.notice.id == id && a.shown)
        else {
            return false;
        };
        if held != a.held {
            if held {
                a.remaining = a.deadline.saturating_sub(now);
            } else {
                a.deadline = now.saturating_add(a.remaining);
            }
            a.held = held;
        }
        true
    }
    pub fn dismiss(&mut self, id: &str) -> bool {
        if self.is_current(id) {
            self.current = None;
            true
        } else {
            false
        }
    }
    pub fn next_deadline(&self) -> Option<u64> {
        self.current
            .as_ref()
            .filter(|a| !a.shown || !a.held)
            .map(|a| a.deadline)
    }
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}
pub fn bottom_right(area: Rect, size: (u32, u32), margin: u32) -> (i32, i32) {
    let x = i64::from(area.x) + i64::from(area.width) - i64::from(size.0) - i64::from(margin);
    let y = i64::from(area.y) + i64::from(area.height) - i64::from(size.1) - i64::from(margin);
    (
        x.max(i64::from(area.x)).min(i64::from(i32::MAX)) as i32,
        y.max(i64::from(area.y)).min(i64::from(i32::MAX)) as i32,
    )
}
#[cfg(test)]
mod tests {
    use super::*;
    fn result(id: &str, outcome: Outcome) -> DownloadResult {
        DownloadResult {
            id: id.into(),
            outcome,
            title: "Example.mp4".into(),
            detail: "Saved".into(),
            app_name: "Example".into(),
        }
    }
    #[test]
    fn timer_starts_after_ack_and_fifo_dismiss_is_id_bound() {
        let mut q = Queue::default();
        q.enqueue(result("a", Outcome::Success)).unwrap();
        q.enqueue(result("b", Outcome::Failure)).unwrap();
        q.advance(0);
        assert!(!q.dismiss("b"));
        assert!(!q.acknowledge("b", 2));
        q.advance(9000);
        assert_eq!(q.frame(9000).unwrap().remaining_ms, 8000);
        assert!(q.acknowledge("a", 9000));
        q.advance(16999);
        assert!(q.is_current("a"));
        q.advance(17000);
        assert!(q.is_current("b"));
        assert!(!q.dismiss("a"));
    }
    #[test]
    fn hover_holds_remaining_time_and_stale_events_do_nothing() {
        let mut q = Queue::default();
        q.enqueue(result("a", Outcome::Failure)).unwrap();
        q.advance(0);
        q.acknowledge("a", 100);
        q.hold("a", true, 2100);
        assert_eq!(q.next_deadline(), None);
        q.advance(999999);
        assert_eq!(q.frame(999999).unwrap().remaining_ms, 10000);
        assert!(!q.hold("b", false, 999999));
        q.hold("a", false, 999999);
        assert_eq!(q.next_deadline(), Some(1009999));
    }
    #[test]
    fn undeliverable_window_is_bounded_and_reports_only_delivery_failure() {
        let mut q = Queue::default();
        q.enqueue(result("a", Outcome::Success)).unwrap();
        q.enqueue(result("b", Outcome::Success)).unwrap();
        q.advance(0);
        assert_eq!(q.advance(10000), Some("a".into()));
        assert!(q.is_current("b"));
        assert_eq!(q.frame(10000).unwrap().remaining_ms, 8000);
    }
    #[test]
    fn bounded_backpressure_and_dedup_do_not_silently_drop() {
        let mut q = Queue::default();
        for id in 0..MAX_PENDING {
            assert_eq!(
                q.enqueue(result(&id.to_string(), Outcome::Success))
                    .unwrap(),
                Accepted::Queued
            );
        }
        assert_eq!(
            q.enqueue(result("0", Outcome::Success)).unwrap(),
            Accepted::Duplicate
        );
        assert!(q.enqueue(result("overflow", Outcome::Failure)).is_err());
        q.advance(0);
        assert_eq!(
            q.enqueue(result("overflow", Outcome::Failure)).unwrap(),
            Accepted::Queued
        );
    }
    #[test]
    fn geometry_handles_negative_monitors_dpi_margin_and_small_work_areas() {
        assert_eq!(
            bottom_right(
                Rect {
                    x: -1920,
                    y: 0,
                    width: 1920,
                    height: 1040
                },
                (568, 128),
                24
            ),
            (-592, 888)
        );
        assert_eq!(
            bottom_right(
                Rect {
                    x: 10,
                    y: 20,
                    width: 100,
                    height: 50
                },
                (284, 64),
                12
            ),
            (10, 20)
        );
    }
    #[test]
    fn invalid_inputs_rejected_without_queue_mutation() {
        let mut q = Queue::default();
        let mut n = result("", Outcome::Success);
        assert!(q.enqueue(n.clone()).is_err());
        n.id = "id".into();
        n.detail = "x".repeat(2049);
        assert!(q.enqueue(n).is_err());
        assert!(q.frame(0).is_none());
    }
}
