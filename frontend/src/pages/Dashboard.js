import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Tag, Button, Empty, message, List, Typography } from 'antd';
import { 
  FileTextOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  EditOutlined,
  EyeOutlined,
  TeamOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { reportAPI, statsAPI } from '../services/api';

const { Title, Text } = Typography;

const getCurrentWeek = () => {
  const today = new Date();
  const year = today.getFullYear();
  const week = Math.ceil((today - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  return `${year}W${week.toString().padStart(2, '0')}`;
};

const Dashboard = () => {
  const { isMember, isManager, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentWeekReport, setCurrentWeekReport] = useState(null);
  const [stats, setStats] = useState(null);
  const [unsubmitted, setUnsubmitted] = useState(null);

  const currentWeek = getCurrentWeek();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isMember()) {
          const response = await reportAPI.getMyWeekReport(currentWeek);
          setCurrentWeekReport(response.data);
        }

        if (isManager()) {
          const [statsResponse, unsubmittedResponse] = await Promise.all([
            statsAPI.getSubmissionStats(),
            statsAPI.getUnsubmitted({ week: currentWeek })
          ]);
          setStats(statsResponse.data);
          setUnsubmitted(unsubmittedResponse.data);
        }
      } catch (error) {
        message.error('获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isMember, isManager, currentWeek]);

  const getStatusTag = (status) => {
    const statusMap = {
      draft: { color: 'default', text: '草稿' },
      submitted: { color: 'success', text: '已提交' },
      returned: { color: 'warning', text: '已退回' },
    };
    const info = statusMap[status] || { color: 'default', text: status };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const getReportCard = () => {
    if (!currentWeekReport) return null;

    const canEdit = currentWeekReport.can_edit;
    const status = currentWeekReport.status;

    return (
      <Card 
        title={
          <span>
            <FileTextOutlined style={{ marginRight: 8 }} />
            本周周报 ({currentWeek})
          </span>
        }
        extra={
          <Button 
            type="primary" 
            icon={canEdit ? <EditOutlined /> : <EyeOutlined />}
            onClick={() => navigate('/report/write')}
          >
            {canEdit ? '填写' : '查看'}
          </Button>
        }
      >
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="状态"
              value={status}
              formatter={() => getStatusTag(status)}
            />
          </Col>
          {currentWeekReport.submitted_at && (
            <Col span={6}>
              <Statistic
                title="提交时间"
                value={new Date(currentWeekReport.submitted_at).toLocaleString('zh-CN')}
              />
            </Col>
          )}
          {currentWeekReport.return_reason && (
            <Col span={12}>
              <div style={{ background: '#fff7e6', padding: 12, borderRadius: 4 }}>
                <Text type="warning" style={{ fontWeight: 'bold' }}>退回原因：</Text>
                <br />
                <Text type="warning">{currentWeekReport.return_reason}</Text>
              </div>
            </Col>
          )}
        </Row>
        {currentWeekReport.content && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <Text type="secondary">内容预览：</Text>
            <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', color: '#333' }}>
              {currentWeekReport.content.substring(0, 200)}
              {currentWeekReport.content.length > 200 && '...'}
            </div>
          </div>
        )}
      </Card>
    );
  };

  const getManagerStats = () => {
    if (!isManager()) return null;

    return (
      <>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总成员数"
                value={stats?.user_stats?.length || 0}
                prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="本周已提交"
                value={unsubmitted?.submitted_count || 0}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="本周未提交"
                value={unsubmitted?.unsubmitted_count || 0}
                prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="提交率"
                value={unsubmitted ? Math.round((unsubmitted.submitted_count / Math.max(unsubmitted.total_members, 1)) * 100) : 0}
                suffix="%"
                prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
        </Row>

        {unsubmitted?.unsubmitted_members?.length > 0 && (
          <Card 
            title={
              <span>
                <ExclamationCircleOutlined style={{ marginRight: 8, color: '#faad14' }} />
                未提交人员名单 ({currentWeek})
              </span>
            }
            style={{ marginBottom: 24 }}
            extra={
              <Button 
                type="primary" 
                danger
                onClick={() => navigate('/manage/reminder')}
              >
                去催报
              </Button>
            }
          >
            <List
              grid={{ gutter: 16, column: 4 }}
              dataSource={unsubmitted.unsubmitted_members}
              renderItem={(item) => (
                <List.Item>
                  <Card size="small" style={{ background: '#fff7e6' }}>
                    <div style={{ textAlign: 'center' }}>
                      <Text strong>{item.real_name}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.team_name || '无团队'}
                      </Text>
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          </Card>
        )}

        {stats?.week_stats?.length > 0 && (
          <Card title={<span><BarChartOutlined style={{ marginRight: 8 }} />最近提交情况</span>}>
            <List
              dataSource={stats.week_stats.slice(0, 5)}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={`第 ${item.week} 周`}
                    description={
                      <span>
                        提交: {item.submitted} 份 | 
                        退回: {item.returned} 份 | 
                        提交率: {item.submission_rate}%
                      </span>
                    }
                  />
                  <Tag color={item.submission_rate >= 80 ? 'success' : item.submission_rate >= 50 ? 'warning' : 'error'}>
                    {item.submission_rate}%
                  </Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Text>加载中...</Text>
      </div>
    );
  }

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        欢迎回来，{user?.real_name}！
      </Title>

      {isMember() && (
        <div style={{ marginBottom: 24 }}>
          {getReportCard()}
        </div>
      )}

      {getManagerStats()}

      {!isManager() && (
        <Row gutter={16}>
          <Col span={12}>
            <Card 
              hoverable
              onClick={() => navigate('/report/write')}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ textAlign: 'center', padding: 20 }}>
                <EditOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                <Title level={5} style={{ marginTop: 16 }}>填写周报</Title>
                <Text type="secondary">记录本周工作，规划下周任务</Text>
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card 
              hoverable
              onClick={() => navigate('/report/history')}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ textAlign: 'center', padding: 20 }}>
                <FileTextOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                <Title level={5} style={{ marginTop: 16 }}>我的周报</Title>
                <Text type="secondary">查看历史周报记录</Text>
              </div>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default Dashboard;
